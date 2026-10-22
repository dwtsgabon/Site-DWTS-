/**
 * DWTS : réception des preuves de paiement et suivi des commissions parrain.
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
  COMMISSION_DEX: 500, // FCFA par commande DEX payée avec un code parrain
  SEUIL_VERSEMENT: 5000 // versement au parrain dès ce solde
};

const FEUILLE_PAIEMENTS = 'Paiements';
const FEUILLE_COMMISSIONS = 'Commissions';
const ENTETES = ['Reçu le', 'Nom', 'WhatsApp', 'Service', 'Commande', 'Montant (XAF)', 'Moyen',
  'TID', 'Code parrain', 'Capture', 'Statut', 'Commission (FCFA)', 'Mois', 'Alerte'];
// Numéros de colonnes (1 = A)
const COL = { TID: 8, PARRAIN: 9, SERVICE: 4, STATUT: 11, COMMISSION: 12 };
const STATUTS = ['À vérifier', 'Validé', 'Refusé'];

/** Crée les feuilles, les listes et le dossier des captures. À lancer une seule fois. */
function installer() {
  const classeur = SpreadsheetApp.getActive();

  let feuille = classeur.getSheetByName(FEUILLE_PAIEMENTS) || classeur.insertSheet(FEUILLE_PAIEMENTS);
  feuille.getRange(1, 1, 1, ENTETES.length).setValues([ENTETES]).setFontWeight('bold');
  feuille.setFrozenRows(1);
  const regle = SpreadsheetApp.newDataValidation().requireValueInList(STATUTS, true).build();
  feuille.getRange(2, COL.STATUT, 1000, 1).setDataValidation(regle);

  let synthese = classeur.getSheetByName(FEUILLE_COMMISSIONS) || classeur.insertSheet(FEUILLE_COMMISSIONS);
  synthese.clear();
  synthese.getRange('A1').setValue('Commissions à verser par mois et par parrain (paiements validés)').setFontWeight('bold');
  synthese.getRange('A2').setFormula(
    "=IFERROR(QUERY(Paiements!A2:N, \"select M, I, sum(L) where K = 'Validé' and I <> '' and L > 0 " +
    "group by M, I label M 'Mois', I 'Code parrain', sum(L) 'Total (FCFA)'\", 0), \"Aucune commission pour l'instant\")");
  synthese.getRange('E1').setValue('Versement dès ' + CONFIG.SEUIL_VERSEMENT + ' FCFA').setFontWeight('bold');

  dossierCaptures_();
}

/** Reçoit une preuve envoyée depuis paiement.html. */
function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    if (!d.nom || !d.whatsapp || !d.montant || !d.capture) throw new Error('Champs manquants');

    const maintenant = new Date();
    const fuseau = Session.getScriptTimeZone();
    const nomFichier = Utilities.formatDate(maintenant, fuseau, 'yyyy-MM-dd_HH-mm') + '_' + nettoyer_(d.nom) + '.jpg';
    const image = Utilities.newBlob(Utilities.base64Decode(d.capture), 'image/jpeg', nomFichier);
    const fichier = dossierCaptures_().createFile(image);

    const feuille = SpreadsheetApp.getActive().getSheetByName(FEUILLE_PAIEMENTS);
    const tid = String(d.tid || '').trim().toUpperCase();
    const alerte = tid && tidDejaVu_(feuille, tid) ? 'TID déjà envoyé : vérifier' : '';

    feuille.appendRow([
      maintenant, d.nom, "'" + d.whatsapp, d.branche, d.commande, Number(d.montant), d.moyen,
      tid, String(d.parrain || '').trim().toUpperCase(), fichier.getUrl(), 'À vérifier', '',
      Utilities.formatDate(maintenant, fuseau, 'yyyy-MM'), alerte
    ]);

    MailApp.sendEmail(CONFIG.EMAIL_ALERTE,
      'DWTS : nouvelle preuve de paiement (' + d.montant + ' XAF)',
      d.nom + ' (' + d.whatsapp + ') a envoyé une preuve.\n' +
      'Service : ' + d.branche + ' | Commande : ' + d.commande + '\n' +
      'Montant : ' + d.montant + ' XAF | Moyen : ' + d.moyen + (tid ? ' | TID : ' + tid : '') + '\n' +
      (alerte ? '⚠️ ' + alerte + '\n' : '') +
      'Capture : ' + fichier.getUrl() + '\n\n' +
      'Vérifiez le SMS de réception, puis passez le statut à « Validé » dans le tableau.');

    return reponse_({ ok: true });
  } catch (erreur) {
    return reponse_({ ok: false, erreur: String(erreur) });
  }
}

/**
 * Quand Elie passe un statut à « Validé », la commission DEX du parrain est ajoutée.
 * Visuo et Logia : commission mensuelle selon le pack, à saisir à la main dans la colonne Commission.
 */
function onEdit(e) {
  const feuille = e.range.getSheet();
  if (feuille.getName() !== FEUILLE_PAIEMENTS || e.range.getColumn() !== COL.STATUT || e.range.getRow() < 2) return;

  const ligne = e.range.getRow();
  const parrain = feuille.getRange(ligne, COL.PARRAIN).getValue();
  const service = feuille.getRange(ligne, COL.SERVICE).getValue();
  const cellule = feuille.getRange(ligne, COL.COMMISSION);

  if (e.value === 'Validé' && parrain && service === 'DEX') {
    cellule.setValue(CONFIG.COMMISSION_DEX);
  } else if (e.value !== 'Validé' && service === 'DEX') {
    cellule.clearContent();
  }
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

function nettoyer_(texte) {
  return String(texte).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').slice(0, 40);
}

function reponse_(objet) {
  return ContentService.createTextOutput(JSON.stringify(objet)).setMimeType(ContentService.MimeType.JSON);
}
