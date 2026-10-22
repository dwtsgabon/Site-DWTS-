/**
 * DWTS : réception des preuves de paiement et suivi des commissions parrain.
 *
 * Le client envoie seulement son numéro WhatsApp + la capture OU le SMS de paiement collé.
 * Le code parrain est enregistré UNE fois, à l'inscription du client (feuille « Clients ») :
 * ensuite chaque paiement validé de ce client crédite son parrain automatiquement.
 *
 * À coller dans un Google Sheets (Extensions > Apps Script), puis :
 *   1. exécuter la fonction installer() une fois ;
 *   2. déployer en « Application Web » (accès : Tout le monde) ;
 *   3. copier l'adresse obtenue dans URL_SCRIPT de paiement.html.
 * Le détail est dans outils-paiement/README.md.
 */

const CONFIG = {
  EMAIL_ALERTE: 'digitalwtservice@gmail.com', // reçoit une alerte à chaque preuve
  DOSSIER_CAPTURES: 'DWTS - Preuves de paiement', // dossier Google Drive des captures
  COMMISSION_DEX: 500, // FCFA par commande DEX payée par un client parrainé
  SEUIL_VERSEMENT: 5000 // versement au parrain dès ce solde
};

const FEUILLE_PAIEMENTS = 'Paiements';
const FEUILLE_CLIENTS = 'Clients';
const FEUILLE_COMMISSIONS = 'Commissions';

// Paiements : A Reçu le | B WhatsApp | C Service | D Montant | E TID | F SMS collé | G Capture
//             H Code parrain | I Statut | J Commission | K Mois | L Alerte
const ENTETES_PAIEMENTS = ['Reçu le', 'WhatsApp', 'Service', 'Montant (XAF)', 'TID', 'SMS collé', 'Capture',
  'Code parrain', 'Statut', 'Commission (FCFA)', 'Mois', 'Alerte'];
const COL = { SERVICE: 3, MONTANT: 4, TID: 5, PARRAIN: 8, STATUT: 9, COMMISSION: 10 };
const ENTETES_CLIENTS = ['WhatsApp', 'Nom', 'Code parrain', 'Inscrit le'];
const STATUTS = ['À vérifier', 'Validé', 'Refusé'];
const SERVICES = ['DEX', 'Visuo', 'Logia'];

/** Crée les feuilles, les listes et le dossier des captures. À lancer une seule fois. */
function installer() {
  const classeur = SpreadsheetApp.getActive();

  const paiements = classeur.getSheetByName(FEUILLE_PAIEMENTS) || classeur.insertSheet(FEUILLE_PAIEMENTS);
  paiements.getRange(1, 1, 1, ENTETES_PAIEMENTS.length).setValues([ENTETES_PAIEMENTS]).setFontWeight('bold');
  paiements.setFrozenRows(1);
  paiements.getRange(2, COL.STATUT, 1000, 1)
    .setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(STATUTS, true).build());
  paiements.getRange(2, COL.SERVICE, 1000, 1)
    .setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(SERVICES, true).build());

  const clients = classeur.getSheetByName(FEUILLE_CLIENTS) || classeur.insertSheet(FEUILLE_CLIENTS);
  clients.getRange(1, 1, 1, ENTETES_CLIENTS.length).setValues([ENTETES_CLIENTS]).setFontWeight('bold');
  clients.setFrozenRows(1);
  clients.getRange('A:A').setNumberFormat('@'); // garder le 0 devant les numéros

  const synthese = classeur.getSheetByName(FEUILLE_COMMISSIONS) || classeur.insertSheet(FEUILLE_COMMISSIONS);
  synthese.clear();
  synthese.getRange('A1').setValue('Commissions à verser par mois et par parrain (paiements validés)').setFontWeight('bold');
  synthese.getRange('A2').setFormula(
    "=IFERROR(QUERY(Paiements!A2:L, \"select K, H, sum(J) where I = 'Validé' and H <> '' and J > 0 " +
    "group by K, H label K 'Mois', H 'Code parrain', sum(J) 'Total (FCFA)'\", 0), \"Aucune commission pour l'instant\")");
  synthese.getRange('E1').setValue('Versement dès ' + CONFIG.SEUIL_VERSEMENT + ' FCFA').setFontWeight('bold');

  dossierCaptures_();
}

/** Reçoit une preuve envoyée depuis paiement.html : { whatsapp, sms?, capture? (base64 JPEG) }. */
function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    const numero = normaliserNumero_(d.whatsapp);
    const sms = String(d.sms || '').trim();
    if (!numero || (!sms && !d.capture)) throw new Error('Numéro ou preuve manquant');

    const maintenant = new Date();
    const fuseau = Session.getScriptTimeZone();
    let lienCapture = '';
    if (d.capture) {
      const nomFichier = Utilities.formatDate(maintenant, fuseau, 'yyyy-MM-dd_HH-mm') + '_' + numero + '.jpg';
      lienCapture = dossierCaptures_()
        .createFile(Utilities.newBlob(Utilities.base64Decode(d.capture), 'image/jpeg', nomFichier)).getUrl();
    }

    // Montant et TID lus dans le SMS collé (à compléter à la main pour une capture)
    const lu = lireSms_(sms);
    const feuille = SpreadsheetApp.getActive().getSheetByName(FEUILLE_PAIEMENTS);
    const alerte = lu.tid && tidDejaVu_(feuille, lu.tid) ? 'TID déjà envoyé : vérifier' : '';
    const parrain = parrainDuClient_(numero);

    feuille.appendRow([
      maintenant, "'" + numero, 'DEX', lu.montant || '', lu.tid, sms, lienCapture,
      parrain, 'À vérifier', '', Utilities.formatDate(maintenant, fuseau, 'yyyy-MM'), alerte
    ]);

    MailApp.sendEmail(CONFIG.EMAIL_ALERTE,
      'DWTS : nouvelle preuve de paiement' + (lu.montant ? ' (' + lu.montant + ' XAF)' : ''),
      'Client : ' + numero + (parrain ? ' (parrain ' + parrain + ')' : '') + '\n' +
      (sms ? 'SMS collé : ' + sms + '\n' : '') +
      (lienCapture ? 'Capture : ' + lienCapture + '\n' : '') +
      (alerte ? '⚠️ ' + alerte + '\n' : '') +
      '\nVérifiez le SMS de réception (même montant, même TID), ajustez le Service si ce n\'est pas DEX, ' +
      'puis passez le statut à « Validé » dans le tableau.');

    return reponse_({ ok: true });
  } catch (erreur) {
    return reponse_({ ok: false, erreur: String(erreur) });
  }
}

/**
 * Statut « Validé » sur un paiement DEX d'un client parrainé : 500 FCFA pour le parrain.
 * Recalculé aussi si le Service ou le Code parrain change.
 * Visuo et Logia : commission mensuelle selon le pack, à saisir à la main dans la colonne Commission.
 */
function onEdit(e) {
  const feuille = e.range.getSheet();
  const colonne = e.range.getColumn();
  if (feuille.getName() !== FEUILLE_PAIEMENTS || e.range.getRow() < 2) return;
  if ([COL.STATUT, COL.SERVICE, COL.PARRAIN].indexOf(colonne) === -1) return;

  const ligne = e.range.getRow();
  const valeurs = feuille.getRange(ligne, 1, 1, ENTETES_PAIEMENTS.length).getValues()[0];
  const service = valeurs[COL.SERVICE - 1];
  if (service !== 'DEX') return; // Visuo / Logia : saisie manuelle
  const cellule = feuille.getRange(ligne, COL.COMMISSION);
  if (valeurs[COL.STATUT - 1] === 'Validé' && valeurs[COL.PARRAIN - 1]) {
    cellule.setValue(CONFIG.COMMISSION_DEX);
  } else {
    cellule.clearContent();
  }
}

/** Lit le montant et le TID d'un SMS Airtel Money / Mobicash collé par le client. */
function lireSms_(sms) {
  const resultat = { montant: '', tid: '' };
  if (!sms) return resultat;
  const montant = sms.match(/(\d[\d\s.]*\d|\d)\s*F(?:CFA)?\b/i);
  if (montant) resultat.montant = Number(montant[1].replace(/[\s.]/g, ''));
  const tid = sms.match(/T(?:X|XN)?\s*I\s*d\s*:?\s*([A-Z]{2}\d{6}\.\d{4}\.[A-Z0-9]+)/i);
  if (tid) resultat.tid = tid[1].toUpperCase();
  return resultat;
}

/** Code parrain enregistré pour ce numéro dans la feuille Clients (une seule fois, à l'inscription). */
function parrainDuClient_(numero) {
  const clients = SpreadsheetApp.getActive().getSheetByName(FEUILLE_CLIENTS);
  if (!clients || clients.getLastRow() < 2) return '';
  const lignes = clients.getRange(2, 1, clients.getLastRow() - 1, 3).getValues();
  for (let i = 0; i < lignes.length; i++) {
    if (normaliserNumero_(lignes[i][0]) === numero) return String(lignes[i][2]).trim().toUpperCase();
  }
  return '';
}

/** Garde les 9 derniers chiffres (ex. 077123456), pour comparer 077…, +241 77…, 24177… */
function normaliserNumero_(numero) {
  const chiffres = String(numero || '').replace(/\D/g, '');
  if (chiffres.length < 8) return '';
  const local = chiffres.length > 9 && chiffres.indexOf('241') === 0 ? chiffres.slice(3) : chiffres;
  return local.length === 8 ? '0' + local : local.slice(-9);
}

function tidDejaVu_(feuille, tid) {
  const derniere = feuille.getLastRow();
  if (derniere < 2) return false;
  return feuille.getRange(2, COL.TID, derniere - 1, 1).getValues()
    .some(function (l) { return String(l[0]).toUpperCase() === tid; });
}

function dossierCaptures_() {
  const dossiers = DriveApp.getFoldersByName(CONFIG.DOSSIER_CAPTURES);
  return dossiers.hasNext() ? dossiers.next() : DriveApp.createFolder(CONFIG.DOSSIER_CAPTURES);
}

function reponse_(objet) {
  return ContentService.createTextOutput(JSON.stringify(objet)).setMimeType(ContentService.MimeType.JSON);
}
