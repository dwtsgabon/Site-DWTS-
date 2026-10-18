// Commandes DEX : lecture, calcul du montant (simulateur), choix du client avant paiement.
const config = require('./config');
const sheets = require('./sheets');
const { normaliserEmail } = require('./utilisateurs');

const ONGLET = 'Commandes';
const PAGES_MAX = 2000;

// Statuts possibles (colonne "statut"). Vide = commande que tu viens de créer.
const STATUTS = {
  a_payer: { libelle: 'À payer', ton: 'info' },
  en_attente_paiement: { libelle: 'En attente de paiement', ton: 'attente' },
  paye: { libelle: 'Payée', ton: 'ok' },
  montant_different: { libelle: 'Montant différent', ton: 'erreur' },
  livre: { libelle: 'Livrée', ton: 'ok' },
};

const statutDe = (c) => {
  const s = String(c.statut || '').trim().toLowerCase();
  return STATUTS[s] ? s : 'a_payer';
};

// Le client peut encore choisir / changer son option tant qu'il n'a pas payé.
const peutPayer = (c) => ['a_payer', 'en_attente_paiement'].includes(statutDe(c)) && prixFixe(c) > 0;

// Lit un montant écrit à la main ("2 500", "2500 XAF", 2500) en nombre entier.
function lireMontant(v) {
  if (typeof v === 'number') return Math.round(v);
  const chiffres = String(v || '').replace(/[^\d]/g, '');
  return chiffres ? Number(chiffres) : 0;
}
const prixFixe = (c) => lireMontant(c.prix_fixe);

// Lit le choix du client (formulaire ou adresse). Renvoie { erreur } ou { choix }.
function lireChoix(source) {
  const impression = source.impression === 'oui';
  if (!impression) return { choix: { impression: false, couleur: 0, noirBlanc: 0 } };
  const entier = (v) => {
    const s = String(v === undefined || v === null || v === '' ? '0' : v).trim();
    return /^\d{1,4}$/.test(s) ? Number(s) : NaN;
  };
  const couleur = entier(source.couleur);
  const noirBlanc = entier(source.noir_blanc);
  if (Number.isNaN(couleur) || Number.isNaN(noirBlanc) || couleur > PAGES_MAX || noirBlanc > PAGES_MAX) {
    return { erreur: `Entrez un nombre de pages entre 0 et ${PAGES_MAX}.` };
  }
  if (couleur + noirBlanc === 0) return { erreur: 'Avec impression, indiquez au moins une page à imprimer.' };
  return { choix: { impression: true, couleur, noirBlanc } };
}

// Calcule le détail du total : prix fixe + pages couleur × 500 + pages N&B × 200.
function calculer(commande, choix) {
  const r = config.regles;
  const fixe = prixFixe(commande);
  const montantCouleur = choix.couleur * r.impression_page_couleur;
  const montantNoirBlanc = choix.noirBlanc * r.impression_page_noir_blanc;
  return {
    fixe,
    couleur: choix.couleur,
    noirBlanc: choix.noirBlanc,
    montantCouleur,
    montantNoirBlanc,
    total: fixe + montantCouleur + montantNoirBlanc,
  };
}

const memeNumero = (a, b) => String(a).trim().toUpperCase() === String(b).trim().toUpperCase();

async function listerPour(email) {
  const e = normaliserEmail(email);
  return (await sheets.lire(ONGLET))
    .filter((c) => String(c.numero_commande).trim() && normaliserEmail(c.email_client) === e)
    .reverse(); // les plus récentes d'abord
}

async function trouverPour(email, numero) {
  return (await listerPour(email)).find((c) => memeNumero(c.numero_commande, numero)) || null;
}

// Enregistre le choix du client et le montant attendu, statut "en_attente_paiement".
// Relit la ligne juste avant d'écrire (tu as pu ajouter ou déplacer des lignes dans le Sheet).
async function enregistrerChoix(email, numero, choix) {
  return sheets.transaction(async ({ lire, modifier }) => {
    const e = normaliserEmail(email);
    const c = (await lire(ONGLET)).find((x) => memeNumero(x.numero_commande, numero) && normaliserEmail(x.email_client) === e);
    if (!c) return { erreur: 'Commande introuvable.' };
    if (!peutPayer(c)) return { erreur: 'Cette commande ne peut plus être payée en ligne.' };
    const detail = calculer(c, choix);
    await modifier(ONGLET, c._ligne, {
      impression: choix.impression ? 'oui' : 'non',
      pages_couleur: detail.couleur,
      pages_noir_blanc: detail.noirBlanc,
      montant_attendu: detail.total,
      statut: 'en_attente_paiement',
      date_maj: new Date().toISOString(),
    });
    return { detail };
  });
}

module.exports = { STATUTS, statutDe, peutPayer, prixFixe, lireMontant, lireChoix, calculer, listerPour, trouverPour, enregistrerChoix };
