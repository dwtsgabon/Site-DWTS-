// Commissions de parrainage et solde.
// Règle : une seule commission par commande, quand elle passe à "paye"
// (par un Pulse Chariow ou parce que tu as changé le statut à la main dans le Sheet).
// Montant : 300 XAF si prix_fixe <= 1500, sinon 500 XAF (valeurs dans config/regles.json).
// L'impression n'est jamais comptée.
const crypto = require('crypto');
const config = require('./config');
const sheets = require('./sheets');
const { normaliserEmail, normaliserCode } = require('./utilisateurs');
const { statutDe, prixFixe, lireMontant } = require('./commandes');
const { horodatage } = require('./dates');

const STATUTS_PAYES = ['paye', 'livre'];
const memeNumero = (a, b) => String(a).trim().toUpperCase() === String(b).trim().toUpperCase();

function montantCommission(prix) {
  const r = config.regles;
  return prix <= r.commission_seuil_prix_fixe ? r.commission_petite : r.commission_grande;
}

// Crée les commissions manquantes pour toutes les commandes payées. Renvoie le nombre créé.
async function crediterManquantes() {
  return sheets.transaction(async ({ lire, ajouter }) => {
    const [commandes, utilisateurs, commissions] = await Promise.all([lire('Commandes'), lire('Utilisateurs'), lire('Commissions')]);
    const parEmail = new Map(utilisateurs.map((u) => [normaliserEmail(u.email), u]));
    const codesExistants = new Set(utilisateurs.map((u) => normaliserCode(u.code_parrain)));
    let crees = 0;
    for (const c of commandes) {
      if (!String(c.numero_commande).trim() || !STATUTS_PAYES.includes(statutDe(c))) continue;
      if (commissions.some((x) => memeNumero(x.numero_commande, c.numero_commande))) continue;
      const client = parEmail.get(normaliserEmail(c.email_client));
      const codeParrain = client && normaliserCode(client.parrain_code);
      if (!codeParrain || !codesExistants.has(codeParrain)) continue;
      const prix = prixFixe(c);
      if (prix <= 0) continue;
      const ligne = {
        id: crypto.randomUUID(),
        code_parrain: codeParrain,
        email_filleul: normaliserEmail(c.email_client),
        numero_commande: String(c.numero_commande).trim(),
        prix_fixe: prix,
        montant: montantCommission(prix),
        date: new Date().toISOString(),
      };
      await ajouter('Commissions', ligne);
      commissions.push(ligne);
      crees++;
    }
    return crees;
  });
}

// Évite de relancer la vérification plus d'une fois par minute à l'ouverture du tableau de bord.
let derniereVerification = 0;
async function crediterSiBesoin() {
  if (Date.now() - derniereVerification < 60 * 1000) return 0;
  derniereVerification = Date.now();
  return crediterManquantes();
}

// Toutes les données du tableau de bord d'un parrain.
async function tableauDeBord(utilisateur) {
  const code = normaliserCode(utilisateur.code_parrain);
  const [utilisateurs, commissions, versements] = await Promise.all([
    sheets.lire('Utilisateurs'), sheets.lire('Commissions'), sheets.lire('Versements'),
  ]);
  const mesCommissions = commissions.filter((c) => normaliserCode(c.code_parrain) === code);
  const mesVersements = versements.filter((v) => normaliserCode(v.code_parrain) === code && lireMontant(v.montant) > 0);
  const totalGagne = mesCommissions.reduce((s, c) => s + lireMontant(c.montant), 0);
  const totalVerse = mesVersements.reduce((s, v) => s + lireMontant(v.montant), 0);

  const nomsFilleuls = new Map();
  const filleuls = utilisateurs
    .filter((u) => normaliserCode(u.parrain_code) === code)
    .map((u) => {
      const email = normaliserEmail(u.email);
      nomsFilleuls.set(email, nomCourt(u.nom));
      const gains = mesCommissions.filter((c) => normaliserEmail(c.email_filleul) === email);
      return { nom: nomCourt(u.nom), date: u.date_inscription, commandes: gains.length, gagne: gains.reduce((s, c) => s + lireMontant(c.montant), 0) };
    })
    .sort((a, b) => horodatage(b.date) - horodatage(a.date));

  return {
    solde: totalGagne - totalVerse,
    totalGagne,
    totalVerse,
    minimum: config.regles.versement_minimum,
    filleuls,
    commissions: mesCommissions
      .map((c) => ({ date: c.date, filleul: nomsFilleuls.get(normaliserEmail(c.email_filleul)) || 'Filleul', numero: c.numero_commande, montant: lireMontant(c.montant) }))
      .sort((a, b) => horodatage(b.date) - horodatage(a.date)),
    versements: mesVersements
      .map((v) => ({ date: v.date, montant: lireMontant(v.montant), moyen: v.moyen }))
      .sort((a, b) => horodatage(b.date) - horodatage(a.date)),
  };
}

// "Bob Ndong Mba" → "Bob N." (on ne montre pas le nom complet des filleuls).
function nomCourt(nom) {
  const parties = String(nom || '').trim().split(/\s+/).filter(Boolean);
  if (parties.length === 0) return 'Filleul';
  return parties.length === 1 ? parties[0] : `${parties[0]} ${parties[1][0].toUpperCase()}.`;
}

module.exports = { montantCommission, crediterManquantes, crediterSiBesoin, tableauDeBord };
