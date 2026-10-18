// Comptes clients : création, recherche, vérification du mot de passe, codes parrain.
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const sheets = require('./sheets');

const ONGLET = 'Utilisateurs';
// Sans 0/O ni 1/I/L pour éviter les confusions à la lecture.
const ALPHABET_CODE = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const LONGUEUR_CODE = 6;
// Sert à garder le même temps de réponse quand l'e-mail n'existe pas.
const HASH_FACTICE = bcrypt.hashSync('mot-de-passe-factice', 10);

const normaliserEmail = (e) => String(e || '').trim().toLowerCase();
const normaliserCode = (c) => String(c || '').trim().toUpperCase().replace(/\s+/g, '');

// Ramène un numéro au format 241XXXXXXXX (Gabon) ou à ses chiffres (international avec +).
function normaliserWhatsapp(brut) {
  const texte = String(brut || '').trim();
  const chiffres = texte.replace(/\D/g, '');
  if (chiffres.length === 11 && chiffres.startsWith('241')) return chiffres;
  if (chiffres.length === 9 && chiffres.startsWith('0')) return '241' + chiffres.slice(1);
  if (chiffres.length === 8) return '241' + chiffres;
  if (texte.startsWith('+') && chiffres.length >= 8 && chiffres.length <= 15) return chiffres;
  return null;
}

function genererCode() {
  let code = '';
  const octets = crypto.randomBytes(LONGUEUR_CODE);
  for (let i = 0; i < LONGUEUR_CODE; i++) code += ALPHABET_CODE[octets[i] % ALPHABET_CODE.length];
  return code;
}

// Vérifie les champs du formulaire d'inscription. Renvoie { erreurs, donnees }.
function validerInscription(corps) {
  const erreurs = {};
  const nom = String(corps.nom || '').trim().replace(/\s+/g, ' ');
  const email = normaliserEmail(corps.email);
  const whatsapp = normaliserWhatsapp(corps.whatsapp);
  const motDePasse = String(corps.mot_de_passe || '');
  const codeParrain = normaliserCode(corps.code_parrain);

  if (nom.length < 2 || nom.length > 80) erreurs.nom = 'Entrez votre nom (2 à 80 caractères).';
  if (!whatsapp) erreurs.whatsapp = 'Numéro WhatsApp invalide. Exemple : 062 67 14 45.';
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) erreurs.email = 'Adresse e-mail invalide.';
  if (motDePasse.length < 8) erreurs.mot_de_passe = 'Le mot de passe doit faire au moins 8 caractères.';
  else if (Buffer.byteLength(motDePasse) > 72) erreurs.mot_de_passe = 'Le mot de passe est trop long (72 caractères au plus).';
  if (codeParrain && !/^[A-Z0-9]{6}$/.test(codeParrain)) erreurs.code_parrain = 'Le code parrain fait 6 caractères (lettres et chiffres).';

  return { erreurs, donnees: { nom, email, whatsapp, motDePasse, codeParrain } };
}

// Crée le compte. Renvoie { utilisateur } ou { erreurs }.
async function creer({ nom, email, whatsapp, motDePasse, codeParrain }) {
  const hash = await bcrypt.hash(motDePasse, 10);
  return sheets.transaction(async ({ lire, ajouter }) => {
    const tous = await lire(ONGLET);
    const erreurs = {};
    if (tous.some((u) => normaliserEmail(u.email) === email)) erreurs.email = 'Un compte existe déjà avec cet e-mail. Connectez-vous.';
    if (tous.some((u) => String(u.whatsapp) === whatsapp)) erreurs.whatsapp = 'Ce numéro WhatsApp est déjà utilisé par un autre compte.';
    if (codeParrain) {
      const parrain = tous.find((u) => normaliserCode(u.code_parrain) === codeParrain);
      if (!parrain) erreurs.code_parrain = "Ce code parrain n'existe pas. Vérifiez-le ou laissez le champ vide.";
      else if (normaliserEmail(parrain.email) === email || String(parrain.whatsapp) === whatsapp) {
        erreurs.code_parrain = 'Vous ne pouvez pas utiliser votre propre code parrain.';
      }
    }
    if (Object.keys(erreurs).length) return { erreurs };

    const codesPris = new Set(tous.map((u) => normaliserCode(u.code_parrain)));
    let code;
    do { code = genererCode(); } while (codesPris.has(code));

    const utilisateur = {
      id: crypto.randomUUID(),
      nom,
      whatsapp,
      email,
      mot_de_passe_hash: hash,
      code_parrain: code,
      parrain_code: codeParrain || '',
      date_inscription: new Date().toISOString(),
    };
    await ajouter(ONGLET, utilisateur);
    return { utilisateur };
  });
}

async function trouverParId(id) {
  if (!id) return null;
  return (await sheets.lire(ONGLET)).find((u) => u.id === id) || null;
}

async function trouverParCode(code) {
  const c = normaliserCode(code);
  if (!c) return null;
  return (await sheets.lire(ONGLET)).find((u) => normaliserCode(u.code_parrain) === c) || null;
}

// Renvoie l'utilisateur si l'e-mail et le mot de passe sont bons, sinon null.
async function verifierConnexion(email, motDePasse) {
  const e = normaliserEmail(email);
  const u = (await sheets.lire(ONGLET)).find((x) => normaliserEmail(x.email) === e);
  const ok = await bcrypt.compare(String(motDePasse || ''), u ? String(u.mot_de_passe_hash) : HASH_FACTICE);
  return u && ok ? u : null;
}

// Affiche 24162671445 sous la forme +241 62 67 14 45.
function formaterWhatsapp(n) {
  const s = String(n || '');
  if (s.length === 11 && s.startsWith('241')) return '+241 ' + s.slice(3).replace(/(\d{2})(?=\d)/g, '$1 ');
  return s ? '+' + s : '';
}

module.exports = {
  validerInscription, creer, trouverParId, trouverParCode, verifierConnexion,
  normaliserEmail, normaliserCode, normaliserWhatsapp, formaterWhatsapp,
};
