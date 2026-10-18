// Accès au Google Sheet qui sert de base de données.
// - Lectures mises en cache 30 secondes.
// - Écritures faites une par une (file d'attente) pour éviter les collisions.
const { sheets: sheetsApi, auth: googleAuth } = require('@googleapis/sheets');
const config = require('./config');

// Onglets et colonnes. Les colonnes remplies à la main sont en premier.
const ONGLETS = {
  Utilisateurs: ['id', 'nom', 'whatsapp', 'email', 'mot_de_passe_hash', 'code_parrain', 'parrain_code', 'date_inscription'],
  Commandes: ['numero_commande', 'email_client', 'type_document', 'prix_fixe', 'statut', 'impression', 'pages_couleur', 'pages_noir_blanc', 'montant_attendu', 'montant_paye', 'vente_chariow', 'date_paiement', 'date_maj'],
  Commissions: ['id', 'code_parrain', 'email_filleul', 'numero_commande', 'prix_fixe', 'montant', 'date'],
  Versements: ['date', 'code_parrain', 'montant', 'moyen', 'note'],
  Pulses_recus: ['delivery_id', 'evenement', 'date_reception', 'vente_chariow', 'email', 'montant', 'resultat'],
  Paiements_non_rapproches: ['date', 'vente_chariow', 'email', 'montant', 'raison', 'delivery_id'],
};

const DUREE_CACHE_MS = 30 * 1000;
const cache = new Map(); // onglet -> { quand, lignes }
let client = null;
let fileEcriture = Promise.resolve();

const modeMemoire = () => process.env.SHEETS_MEMOIRE === '1' && !config.production;

function estConfigure() {
  return modeMemoire() || Boolean(config.googleSheetId && config.googleServiceAccountJson);
}

function api() {
  if (client) return client;
  if (modeMemoire()) {
    client = require('./sheets-memoire');
    return client;
  }
  if (!estConfigure()) throw new Error('Google Sheets non configuré (GOOGLE_SHEET_ID / GOOGLE_SERVICE_ACCOUNT_JSON).');
  const identifiants = JSON.parse(Buffer.from(config.googleServiceAccountJson, 'base64').toString('utf8'));
  const auth = new googleAuth.GoogleAuth({
    credentials: identifiants,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  client = sheetsApi({ version: 'v4', auth });
  return client;
}

const idSheet = () => config.googleSheetId || 'memoire';

// Empêche qu'une valeur saisie par un client soit lue comme une formule (=, +, -, @).
function valeurSure(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') return v;
  const s = String(v);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

// Fait passer les tâches d'écriture une par une.
function enFile(tache) {
  const resultat = fileEcriture.then(tache, tache);
  fileEcriture = resultat.catch(() => {});
  return resultat;
}

// ----- Fonctions internes (à appeler seulement depuis la file d'attente) -----

async function lireDirect(onglet) {
  const r = await api().spreadsheets.values.get({
    spreadsheetId: idSheet(),
    range: onglet,
    valueRenderOption: 'UNFORMATTED_VALUE',
  });
  const [entete = [], ...valeurs] = r.data.values || [];
  const lignes = valeurs.map((v, i) => {
    const objet = { _ligne: i + 2 };
    entete.forEach((col, j) => { objet[String(col).trim()] = v[j] === undefined ? '' : v[j]; });
    return objet;
  });
  cache.set(onglet, { quand: Date.now(), lignes });
  return lignes;
}

async function entete(onglet) {
  const r = await api().spreadsheets.values.get({ spreadsheetId: idSheet(), range: `${onglet}!1:1` });
  return ((r.data.values && r.data.values[0]) || []).map((c) => String(c).trim());
}

async function ajouterDirect(onglet, objet) {
  const colonnes = await entete(onglet);
  await api().spreadsheets.values.append({
    spreadsheetId: idSheet(),
    range: onglet,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [colonnes.map((c) => valeurSure(objet[c]))] },
  });
  cache.delete(onglet);
}

async function modifierDirect(onglet, numeroLigne, changements) {
  const colonnes = await entete(onglet);
  const data = [];
  for (const [col, val] of Object.entries(changements)) {
    const j = colonnes.indexOf(col);
    if (j === -1) throw new Error(`Colonne "${col}" absente de l'onglet ${onglet}`);
    data.push({ range: `${onglet}!${lettreColonne(j)}${numeroLigne}`, values: [[valeurSure(val)]] });
  }
  await api().spreadsheets.values.batchUpdate({
    spreadsheetId: idSheet(),
    requestBody: { valueInputOption: 'RAW', data },
  });
  cache.delete(onglet);
}

function lettreColonne(index) {
  let s = '';
  let n = index + 1;
  while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

// ----- Fonctions publiques -----

// Crée les onglets manquants et écrit la ligne d'en-têtes si elle est vide.
async function preparerOnglets() {
  return enFile(async () => {
    const s = api();
    const info = await s.spreadsheets.get({ spreadsheetId: idSheet(), fields: 'sheets.properties.title' });
    const existants = new Set(info.data.sheets.map((f) => f.properties.title));
    const aCreer = Object.keys(ONGLETS).filter((nom) => !existants.has(nom));
    if (aCreer.length) {
      await s.spreadsheets.batchUpdate({
        spreadsheetId: idSheet(),
        requestBody: { requests: aCreer.map((title) => ({ addSheet: { properties: { title } } })) },
      });
    }
    for (const [nom, colonnes] of Object.entries(ONGLETS)) {
      if ((await entete(nom)).length === 0) {
        await s.spreadsheets.values.update({
          spreadsheetId: idSheet(),
          range: `${nom}!A1`,
          valueInputOption: 'RAW',
          requestBody: { values: [colonnes] },
        });
      }
    }
    cache.clear();
    return aCreer;
  });
}

// Lit toutes les lignes d'un onglet : [{ colonne: valeur, _ligne: n° de ligne }].
async function lire(onglet) {
  const enCache = cache.get(onglet);
  if (enCache && Date.now() - enCache.quand < DUREE_CACHE_MS) return enCache.lignes;
  return lireDirect(onglet);
}

const ajouter = (onglet, objet) => enFile(() => ajouterDirect(onglet, objet));
const modifier = (onglet, numeroLigne, changements) => enFile(() => modifierDirect(onglet, numeroLigne, changements));

// Lecture fraîche + écritures enchaînées sans qu'une autre écriture s'intercale.
// Exemple : vérifier qu'un e-mail est libre puis créer le compte.
function transaction(fn) {
  return enFile(() => fn({ lire: lireDirect, ajouter: ajouterDirect, modifier: modifierDirect }));
}

module.exports = { ONGLETS, estConfigure, preparerOnglets, lire, ajouter, modifier, transaction };
