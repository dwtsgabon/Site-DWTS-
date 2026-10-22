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
 * Après chaque paiement validé, une facture PDF au logo de la branche est créée et envoyée par e-mail.
 */

const CONFIG = {
  EMAIL_ALERTE: 'digitalwtservice@gmail.com', // reçoit une alerte à chaque preuve
  DOSSIER_CAPTURES: 'DWTS - Preuves de paiement', // dossier Google Drive des captures
  COMMISSION_DEX: 500, // FCFA par commande DEX payée par un client parrainé
  SEUIL_VERSEMENT: 5000, // versement au parrain dès ce solde
  CODE_DWTS: 'DWTS', // code maison : client sans parrain = commission gardée par DWTS
  DOSSIER_FACTURES: 'DWTS - Factures', // dossier Google Drive des factures PDF
  // Logos imprimés sur les factures (publiés avec le site)
  LOGOS: {
    DWTS: 'https://raw.githubusercontent.com/mbadingaryan-sketch/Site-DWTS-/main/assets/img/logo-dwts.png',
    DEX: 'https://raw.githubusercontent.com/mbadingaryan-sketch/Site-DWTS-/main/assets/img/logo-dex-facture.png',
    Visuo: 'https://raw.githubusercontent.com/mbadingaryan-sketch/Site-DWTS-/main/assets/img/logo-visuo.png',
    Logia: 'https://raw.githubusercontent.com/mbadingaryan-sketch/Site-DWTS-/main/assets/img/logo-logia.png'
  },
  COULEURS: { DEX: '#1E6FD9', Visuo: '#FF6A00', Logia: '#1E9FD9' }
};

const FEUILLE_PAIEMENTS = 'Paiements';
const FEUILLE_CLIENTS = 'Clients';
const FEUILLE_COMMISSIONS = 'Commissions';
const FEUILLE_VERSEMENTS = 'Versements';

// Paiements : A Reçu le | B WhatsApp | C Service | D Montant | E TID | F SMS collé | G Capture
//             H Code parrain | I Statut | J Commission | K Mois | L Alerte | M Désignation | N Facture
const ENTETES_PAIEMENTS = ['Reçu le', 'WhatsApp', 'Service', 'Montant (XAF)', 'TID', 'SMS collé', 'Capture',
  'Code parrain', 'Statut', 'Commission (FCFA)', 'Mois', 'Alerte', 'Désignation (facture)', 'Facture'];
const COL = { WHATSAPP: 2, SERVICE: 3, MONTANT: 4, TID: 5, PARRAIN: 8, STATUT: 9, COMMISSION: 10,
  DESIGNATION: 13, FACTURE: 14 };
// Clients : A WhatsApp | B Nom | C Code de son parrain | D Inscrit le | E Son code parrain | F Code d'accès
const ENTETES_CLIENTS = ['WhatsApp', 'Nom', 'Code de son parrain', 'Inscrit le', 'Son code parrain', 'Code d\'accès'];
const ENTETES_VERSEMENTS = ['Code parrain', 'Date', 'Montant versé (FCFA)', 'Note'];
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
  clients.getRange('F:F').setNumberFormat('@');

  const versements = classeur.getSheetByName(FEUILLE_VERSEMENTS) || classeur.insertSheet(FEUILLE_VERSEMENTS);
  versements.getRange(1, 1, 1, ENTETES_VERSEMENTS.length).setValues([ENTETES_VERSEMENTS]).setFontWeight('bold');
  versements.setFrozenRows(1);

  const synthese = classeur.getSheetByName(FEUILLE_COMMISSIONS) || classeur.insertSheet(FEUILLE_COMMISSIONS);
  synthese.clear();
  // Séparateur d'arguments : « ; » si le tableau est en français (ou autre langue à virgule décimale), « , » sinon
  const sep = /^en/i.test(classeur.getSpreadsheetLocale()) ? ',' : ';';
  synthese.getRange('A1').setValue('Commissions à verser par mois et par parrain (paiements validés)').setFontWeight('bold');
  synthese.getRange('A2').setFormula(
    '=IFERROR(QUERY(Paiements!A2:L' + sep + ' "select K, H, sum(J) where I = \'Validé\' and H <> \'\' and H <> \'' + CONFIG.CODE_DWTS + '\' and J > 0 ' +
    'group by K, H label K \'Mois\', H \'Code parrain\', sum(J) \'Total (FCFA)\'"' + sep + ' 0)' + sep + ' "Aucune commission pour l\'instant")');
  synthese.getRange('E1').setValue('Versement dès ' + CONFIG.SEUIL_VERSEMENT + ' FCFA').setFontWeight('bold');
  // Tableau DWTS : commissions des clients venus sans parrain (gardées par DWTS, rien à verser)
  synthese.getRange('G1').setValue('Commissions DWTS (code ' + CONFIG.CODE_DWTS + ', gardées)').setFontWeight('bold');
  synthese.getRange('G2').setFormula(
    '=IFERROR(QUERY(Paiements!A2:L' + sep + ' "select K, count(J), sum(J) where I = \'Validé\' and H = \'' + CONFIG.CODE_DWTS + '\' and J > 0 ' +
    'group by K label K \'Mois\', count(J) \'Commandes\', sum(J) \'Total (FCFA)\'"' + sep + ' 0)' + sep + ' "Aucune commission pour l\'instant")');
  synthese.getRange('K1').setValue('Total DWTS (FCFA)').setFontWeight('bold');
  synthese.getRange('K2').setFormula(
    '=SUMIFS(Paiements!J2:J' + sep + ' Paiements!I2:I' + sep + ' "Validé"' + sep + ' Paiements!H2:H' + sep + ' "' + CONFIG.CODE_DWTS + '")');

  dossierCaptures_();
  dossier_(CONFIG.DOSSIER_FACTURES);

  // Déclencheur « à la modification » autorisé (nécessaire pour créer les factures PDF)
  ScriptApp.getProjectTriggers()
    .filter(function (d) { return d.getHandlerFunction() === 'surModification'; })
    .forEach(function (d) { ScriptApp.deleteTrigger(d); });
  ScriptApp.newTrigger('surModification').forSpreadsheet(classeur).onEdit().create();
}

/**
 * Pages Inscription et Mon espace (lecture JSON) :
 *   ?action=inscription&nom=…&whatsapp=…&parrain=…  -> { ok, code, pin }
 *   ?action=espace&whatsapp=…&pin=…                 -> { ok, nom, code, paiements, filleuls, commissions, … }
 */
function doGet(e) {
  const p = e.parameter || {};
  try {
    if (p.action === 'inscription') return reponse_(inscrire_(p));
    if (p.action === 'espace') return reponse_(espace_(p));
    return reponse_({ ok: false, erreur: 'Action inconnue' });
  } catch (erreur) {
    return reponse_({ ok: false, erreur: 'Une erreur est survenue, réessayez plus tard.' });
  }
}

/** Inscription unique : code parrain personnel + code d'accès, et code du parrain enregistré une fois. */
function inscrire_(p) {
  const numero = normaliserNumero_(p.whatsapp);
  const nom = String(p.nom || '').trim().slice(0, 80);
  if (!nom || !numero) return { ok: false, erreur: 'Indiquez votre nom et un numéro WhatsApp valide.' };

  const verrou = LockService.getScriptLock();
  verrou.waitLock(10000);
  try {
    const clients = SpreadsheetApp.getActive().getSheetByName(FEUILLE_CLIENTS);
    const lignes = clients.getLastRow() > 1 ? clients.getRange(2, 1, clients.getLastRow() - 1, 6).getValues() : [];
    if (lignes.some(function (l) { return normaliserNumero_(l[0]) === numero; })) {
      return { ok: false, erreur: 'Ce numéro est déjà inscrit. Ouvrez Mon espace, ou écrivez-nous si vous avez oublié votre code.' };
    }
    // Sans code parrain : le code maison DWTS est mis automatiquement
    const parrain = String(p.parrain || '').trim().toUpperCase() || CONFIG.CODE_DWTS;
    if (parrain !== CONFIG.CODE_DWTS && !lignes.some(function (l) { return String(l[4]).toUpperCase() === parrain; })) {
      return { ok: false, erreur: 'Code parrain introuvable. Vérifiez-le, ou laissez la case vide.' };
    }
    const proprietes = PropertiesService.getScriptProperties();
    const suivant = Number(proprietes.getProperty('compteur_parrain') || 0) + 1;
    proprietes.setProperty('compteur_parrain', String(suivant));
    const code = 'PARRAIN-' + ('00' + suivant).slice(-3);
    // Code d'accès choisi par le client (4 à 6 chiffres) ; au hasard s'il n'en a pas envoyé
    const pinChoisi = String(p.pin || '').trim();
    if (pinChoisi && !/^[0-9]{4,6}$/.test(pinChoisi)) return { ok: false, erreur: 'Le code d\'accès doit avoir 4 à 6 chiffres.' };
    const pin = pinChoisi || String(Math.floor(1000 + Math.random() * 9000));
    clients.appendRow(["'" + numero, nom, parrain, new Date(), code, "'" + pin]);
    MailApp.sendEmail(CONFIG.EMAIL_ALERTE, 'DWTS : nouvelle inscription (' + nom + ')',
      nom + ' (' + numero + ') s\'est inscrit. Son code parrain : ' + code + (parrain === CONFIG.CODE_DWTS ? '. Sans parrain (code DWTS).' : '. Parrainé par ' + parrain + '.'));
    return { ok: true, code: code, pin: pin };
  } finally {
    verrou.releaseLock();
  }
}

/** Mon espace : paiements et factures du client ; filleuls, gains et solde s'il est parrain. */
function espace_(p) {
  const numero = normaliserNumero_(p.whatsapp);
  const cache = CacheService.getScriptCache();
  const cleEssais = 'essais_' + numero;
  const essais = Number(cache.get(cleEssais) || 0);
  if (!numero) return { ok: false, erreur: 'Numéro WhatsApp invalide.' };
  if (essais >= 5) return { ok: false, erreur: 'Trop d\'essais. Réessayez dans une heure ou écrivez-nous.' };

  const classeur = SpreadsheetApp.getActive();
  const clients = classeur.getSheetByName(FEUILLE_CLIENTS);
  const lignes = clients.getLastRow() > 1 ? clients.getRange(2, 1, clients.getLastRow() - 1, 6).getValues() : [];
  const client = lignes.filter(function (l) { return normaliserNumero_(l[0]) === numero; })[0];
  if (!client || String(client[5]).replace(/^'/, '') !== String(p.pin || '').trim()) {
    cache.put(cleEssais, String(essais + 1), 3600);
    return { ok: false, erreur: 'Numéro ou code d\'accès incorrect.' };
  }
  cache.remove(cleEssais);
  const code = String(client[4]).toUpperCase();
  const fuseau = Session.getScriptTimeZone();

  const feuille = classeur.getSheetByName(FEUILLE_PAIEMENTS);
  const donnees = feuille.getLastRow() > 1 ? feuille.getRange(2, 1, feuille.getLastRow() - 1, ENTETES_PAIEMENTS.length).getValues() : [];
  const paiements = [];
  const parMois = {};
  let gainsTotal = 0;
  donnees.forEach(function (l) {
    if (normaliserNumero_(l[COL.WHATSAPP - 1]) === numero) {
      paiements.push({
        date: l[0] instanceof Date ? Utilities.formatDate(l[0], fuseau, 'dd/MM/yyyy') : String(l[0]),
        service: l[COL.SERVICE - 1], montant: Number(l[COL.MONTANT - 1]) || 0,
        statut: l[COL.STATUT - 1], facture: l[COL.STATUT - 1] === 'Validé' ? l[COL.FACTURE - 1] : ''
      });
    }
    if (code && String(l[COL.PARRAIN - 1]).toUpperCase() === code && l[COL.STATUT - 1] === 'Validé') {
      const gain = Number(l[COL.COMMISSION - 1]) || 0;
      const mois = l[10] || '';
      parMois[mois] = parMois[mois] || { mois: mois, commandes: 0, gains: 0 };
      parMois[mois].commandes += 1;
      parMois[mois].gains += gain;
      gainsTotal += gain;
    }
  });

  const versements = classeur.getSheetByName(FEUILLE_VERSEMENTS);
  const verse = versements && versements.getLastRow() > 1 ?
    versements.getRange(2, 1, versements.getLastRow() - 1, 3).getValues()
      .filter(function (l) { return String(l[0]).toUpperCase() === code; })
      .reduce(function (total, l) { return total + (Number(l[2]) || 0); }, 0) : 0;

  return {
    ok: true, nom: client[1], code: code,
    paiements: paiements.reverse(),
    filleuls: lignes.filter(function (l) { return String(l[2]).toUpperCase() === code; }).length,
    commissions: Object.keys(parMois).sort().reverse().map(function (m) { return parMois[m]; }),
    gainsTotal: gainsTotal, verse: verse, solde: gainsTotal - verse
  };
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
    const parrain = parrainDuClient_(numero) || CONFIG.CODE_DWTS; // client non inscrit ou sans parrain : DWTS

    feuille.appendRow([
      maintenant, "'" + numero, 'DEX', lu.montant || '', lu.tid, sms, lienCapture,
      parrain, 'À vérifier', '', Utilities.formatDate(maintenant, fuseau, 'yyyy-MM'), alerte, '', ''
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
 * Déclencheur installé par installer() à chaque modification du tableau.
 * - Statut « Validé » sur un paiement DEX d'un client parrainé : 500 FCFA pour le parrain
 *   (recalculé si le Service ou le Code parrain change). Visuo et Logia : commission saisie à la main.
 * - Statut « Validé » : une facture PDF au logo de la branche est créée (une seule fois),
 *   son lien est noté dans la colonne Facture et elle est envoyée par e-mail, prête à transférer au client.
 */
function surModification(e) {
  const feuille = e.range.getSheet();
  const colonne = e.range.getColumn();
  if (feuille.getName() !== FEUILLE_PAIEMENTS || e.range.getRow() < 2) return;
  if ([COL.STATUT, COL.SERVICE, COL.PARRAIN].indexOf(colonne) === -1) return;

  const ligne = e.range.getRow();
  const valeurs = feuille.getRange(ligne, 1, 1, ENTETES_PAIEMENTS.length).getValues()[0];
  const service = valeurs[COL.SERVICE - 1];
  const valide = valeurs[COL.STATUT - 1] === 'Validé';

  if (service === 'DEX') {
    const cellule = feuille.getRange(ligne, COL.COMMISSION);
    if (valide && valeurs[COL.PARRAIN - 1]) cellule.setValue(CONFIG.COMMISSION_DEX); else cellule.clearContent();
  }
  if (valide && colonne === COL.STATUT && !valeurs[COL.FACTURE - 1]) {
    const lien = creerFacture_(valeurs);
    feuille.getRange(ligne, COL.FACTURE).setValue(lien);
  }
}

/** Crée la facture PDF (logo de la branche + logo DWTS), la range dans Drive et l'envoie par e-mail. */
function creerFacture_(v) {
  const service = SERVICES.indexOf(v[COL.SERVICE - 1]) === -1 ? 'DEX' : v[COL.SERVICE - 1];
  const numero = numeroFacture_(service);
  const fuseau = Session.getScriptTimeZone();
  const date = Utilities.formatDate(new Date(), fuseau, 'dd/MM/yyyy');
  const telephone = String(v[COL.WHATSAPP - 1]).replace(/^'/, '');
  const client = nomDuClient_(telephone);
  const designation = v[COL.DESIGNATION - 1] || 'Prestation ' + service;
  const montant = Number(v[COL.MONTANT - 1]) || 0;
  const montantTexte = montant.toLocaleString('fr-FR').replace(/\u202f|\u00a0/g, ' ') + ' XAF';
  const tid = v[COL.TID - 1];
  const couleur = CONFIG.COULEURS[service];

  const html =
    '<html><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif;color:#111;margin:28px;font-size:12px">' +
    '<table style="width:100%"><tr><td>' + imageLogo_(service, 64) + '</td>' +
    '<td style="text-align:right">' + imageLogo_('DWTS', 48) + '</td></tr></table>' +
    '<div style="font-weight:bold;margin-top:8px">DWTS · Digital World Technology Service</div>' +
    '<div style="color:#6b7280;font-size:10px;border-bottom:2px solid ' + couleur + ';padding-bottom:6px">' +
    'Port-Gentil, Gabon · WhatsApp 062 67 14 45 · digitalwtservice@gmail.com</div>' +
    '<table style="width:100%;margin-top:14px"><tr>' +
    '<td><div style="color:' + couleur + ';font-weight:bold;font-size:10px">FACTURÉ À</div>' +
    '<b>' + (client || 'Client') + '</b><br>' + telephone + '</td>' +
    '<td style="text-align:right"><b>FACTURE N° <span style="color:' + couleur + '">' + numero + '</span></b><br>Date : ' + date + '</td>' +
    '</tr></table>' +
    '<table style="width:100%;border-collapse:collapse;margin-top:14px">' +
    '<tr style="background:#111827;color:#fff"><td style="padding:6px">Désignation</td><td style="padding:6px;text-align:right">Total</td></tr>' +
    '<tr><td style="padding:6px;border-bottom:1px solid #e5e7eb">' + designation + '</td>' +
    '<td style="padding:6px;border-bottom:1px solid #e5e7eb;text-align:right">' + montantTexte + '</td></tr>' +
    '<tr style="background:' + couleur + ';color:#fff;font-weight:bold"><td style="padding:8px;text-align:right">TOTAL PAYÉ</td>' +
    '<td style="padding:8px;text-align:right">' + montantTexte + '</td></tr></table>' +
    '<p style="color:#4b5563;font-size:10px">Payé par mobile money le ' + date + (tid ? ' · TID : ' + tid : '') + '</p>' +
    '<p style="text-align:center;color:' + couleur + ';font-weight:bold;margin-top:18px">Merci pour votre confiance !</p>' +
    '</body></html>';

  const pdf = HtmlService.createHtmlOutput(html).getBlob().getAs('application/pdf').setName(numero + '.pdf');
  const fichier = dossier_(CONFIG.DOSSIER_FACTURES).createFile(pdf);
  fichier.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); // lisible depuis Mon espace
  MailApp.sendEmail(CONFIG.EMAIL_ALERTE, 'DWTS : facture ' + numero + ' (' + montantTexte + ')',
    'Facture prête pour ' + (client || telephone) + '.\nTransférez le PDF joint au client sur WhatsApp (' + telephone + ').\n' +
    fichier.getUrl(), { attachments: [pdf] });
  return fichier.getUrl();
}

/** FAC-D-0001, FAC-V-0001, FAC-L-0001 : un compteur par branche. */
function numeroFacture_(service) {
  const proprietes = PropertiesService.getScriptProperties();
  const cle = 'compteur_' + service;
  const suivant = Number(proprietes.getProperty(cle) || 0) + 1;
  proprietes.setProperty(cle, String(suivant));
  return 'FAC-' + service.charAt(0) + '-' + ('000' + suivant).slice(-4);
}

/** Logo en image intégrée (si le lien ne répond pas, le nom de la branche s'affiche à la place). */
function imageLogo_(nom, hauteur) {
  try {
    const image = UrlFetchApp.fetch(CONFIG.LOGOS[nom]).getBlob();
    return '<img style="height:' + hauteur + 'px" src="data:image/png;base64,' +
      Utilities.base64Encode(image.getBytes()) + '">';
  } catch (erreur) {
    return '<b style="font-size:22px">' + nom + '</b>';
  }
}

function nomDuClient_(telephone) {
  const clients = SpreadsheetApp.getActive().getSheetByName(FEUILLE_CLIENTS);
  const numero = normaliserNumero_(telephone);
  if (!clients || clients.getLastRow() < 2 || !numero) return '';
  const lignes = clients.getRange(2, 1, clients.getLastRow() - 1, 2).getValues();
  for (let i = 0; i < lignes.length; i++) {
    if (normaliserNumero_(lignes[i][0]) === numero) return String(lignes[i][1]).trim();
  }
  return '';
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
  return dossier_(CONFIG.DOSSIER_CAPTURES);
}

function dossier_(nom) {
  const dossiers = DriveApp.getFoldersByName(nom);
  return dossiers.hasNext() ? dossiers.next() : DriveApp.createFolder(nom);
}

function reponse_(objet) {
  return ContentService.createTextOutput(JSON.stringify(objet)).setMimeType(ContentService.MimeType.JSON);
}
