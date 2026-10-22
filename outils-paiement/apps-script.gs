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
  DOSSIER_FACTURES: 'DWTS - Factures',
  DOSSIER_DEVIS: 'DWTS - Devis', // dossier Google Drive des factures PDF
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
const FEUILLE_DEVIS = 'Devis';
const ENTETES_DEVIS = ['Reçu le', 'N° devis', 'Branche', 'WhatsApp', 'Nom', 'E-mail', 'Lignes', 'Total unique (XAF)', 'Total mensuel (XAF)', 'Précisions', 'PDF'];

// Paiements : A Reçu le | B WhatsApp | C Service | D Montant | E TID | F SMS collé | G Capture
//             H Code parrain | I Statut | J Commission | K Mois | L Alerte | M Désignation | N Facture
const ENTETES_PAIEMENTS = ['Reçu le', 'WhatsApp', 'Service', 'Montant (XAF)', 'TID', 'SMS collé', 'Capture',
  'Code parrain', 'Statut', 'Commission (FCFA)', 'Mois', 'Alerte', 'Désignation (facture)', 'Facture'];
const COL = { WHATSAPP: 2, SERVICE: 3, MONTANT: 4, TID: 5, SMS: 6, CAPTURE: 7, PARRAIN: 8, STATUT: 9, COMMISSION: 10,
  DESIGNATION: 13, FACTURE: 14 };
// Clients : A WhatsApp | B Nom | C Code de son parrain | D Inscrit le | E Son code parrain | F Code d'accès | G E-mail
const ENTETES_CLIENTS = ['WhatsApp', 'Nom', 'Code de son parrain', 'Inscrit le', 'Son code parrain', 'Code d\'accès', 'E-mail'];
const ENTETES_VERSEMENTS = ['Code parrain', 'Date', 'Montant versé (FCFA)', 'Note'];
const STATUTS = ['À vérifier', 'Validé', 'Refusé'];
const SERVICES = ['DEX', 'Visuo', 'Logia'];

// DEBUT CATALOGUE (même liste que assets/js/catalogue-devis.js)
const CATALOGUE_DEVIS = [["Visuo","Logo","Basique",6500,"Unique"],["Visuo","Logo","Standard",10000,"Unique"],["Visuo","Logo","Premium",15000,"Unique"],["Visuo","Affiche ou flyer","Basique",2500,"Unique"],["Visuo","Affiche ou flyer","Standard",4000,"Unique"],["Visuo","Affiche ou flyer","Premium",6000,"Unique"],["Visuo","Carte d'invitation","Basique",2000,"Unique"],["Visuo","Carte d'invitation","Standard",3000,"Unique"],["Visuo","Carte d'invitation","Premium",5000,"Unique"],["Visuo","Carte de visite","Basique",2000,"Unique"],["Visuo","Carte de visite","Standard",3000,"Unique"],["Visuo","Carte de visite","Premium",5000,"Unique"],["Visuo","Modèle de facture ou devis","Basique",2500,"Unique"],["Visuo","Modèle de facture ou devis","Standard",3500,"Unique"],["Visuo","Modèle de facture ou devis","Premium",5000,"Unique"],["Visuo","Vidéo publicitaire 15 à 30 s","Basique",7500,"Unique"],["Visuo","Vidéo publicitaire 15 à 30 s","Standard",9500,"Unique"],["Visuo","Vidéo publicitaire 15 à 30 s","Premium",15000,"Unique"],["Visuo","Site vitrine","Basique",12500,"Unique"],["Visuo","Site vitrine","Standard",25000,"Unique"],["Visuo","Site vitrine","Premium",45000,"Unique"],["Visuo","Maintenance du site","Basique",2500,"Mensuel"],["Visuo","Maintenance du site","Standard",5000,"Mensuel"],["Visuo","Maintenance du site","Premium",10000,"Mensuel"],["Visuo","Gestion des pages","Basique",7000,"Mensuel"],["Visuo","Gestion des pages","Standard",12500,"Mensuel"],["Visuo","Gestion des pages","Premium",22000,"Mensuel"],["Visuo","Gestion du compte WhatsApp","Toutes formules",10000,"Mensuel"],["Visuo","Publication réseaux","À l'unité",1000,"Unique"],["Visuo","Pack Starter (1 affiche, 4 publications)","Pack",6000,"Mensuel"],["Visuo","Pack Basique (2 affiches, 8 publications, 1 vidéo)","Pack",18000,"Mensuel"],["Visuo","Pack Standard (4 affiches, 12 publications, 2 vidéos, maintenance)","Pack",50000,"Mensuel"],["Visuo","Pack Premium (6 affiches, 20 publications, 4 vidéos, maintenance)","Pack",115000,"Mensuel"],["Visuo","Site + facture avec un pack","Basique",15000,"Unique"],["Visuo","Site + facture avec un pack","Standard",28000,"Unique"],["Visuo","Site + facture avec un pack","Premium",50000,"Unique"],["Logia","Automatisation","Basique",7500,"Unique"],["Logia","Automatisation","Standard",15000,"Unique"],["Logia","Automatisation","Premium",30000,"Unique"],["Logia","Bot WhatsApp","Basique",15000,"Unique"],["Logia","Bot WhatsApp","Standard",30000,"Unique"],["Logia","Bot WhatsApp","Premium",60000,"Unique"],["Logia","Logiciel de gestion","Basique",45000,"Unique"],["Logia","Logiciel de gestion","Standard",90000,"Unique"],["Logia","Logiciel de gestion","Premium",180000,"Unique"],["Logia","Suivi","Basique",5000,"Mensuel"],["Logia","Suivi","Standard",10000,"Mensuel"],["Logia","Suivi","Premium",20000,"Mensuel"],["Logia","Pack Starter : mise en service","Pack",7500,"Unique"],["Logia","Pack Starter : suivi","Pack",5000,"Mensuel"],["Logia","Pack Business : mise en service","Pack",40000,"Unique"],["Logia","Pack Business : suivi","Pack",10000,"Mensuel"],["Logia","Pack Entreprise : mise en service","Pack",110000,"Unique"],["Logia","Pack Entreprise : suivi","Pack",20000,"Mensuel"]];
// FIN CATALOGUE


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

  const devis = classeur.getSheetByName(FEUILLE_DEVIS) || classeur.insertSheet(FEUILLE_DEVIS);
  devis.getRange(1, 1, 1, ENTETES_DEVIS.length).setValues([ENTETES_DEVIS]).setFontWeight('bold');
  devis.setFrozenRows(1);
  devis.getRange('D:D').setNumberFormat('@');
  dossier_(CONFIG.DOSSIER_DEVIS);

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
    if (p.action === 'valider' || p.action === 'refuser') return pageValidation_(p);
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
  const email = String(p.email || '').trim().toLowerCase().slice(0, 120);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, erreur: 'Indiquez une adresse e-mail valide.' };

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
    clients.appendRow(["'" + numero, nom, parrain, new Date(), code, "'" + pin, email]);
    MailApp.sendEmail(CONFIG.EMAIL_ALERTE, 'DWTS : nouvelle inscription (' + nom + ')',
      nom + ' (' + numero + ', ' + email + ') s\'est inscrit. Son code parrain : ' + code + (parrain === CONFIG.CODE_DWTS ? '. Sans parrain (code DWTS).' : '. Parrainé par ' + parrain + '.'));
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
  if (!client) {
    return { ok: false, erreur: 'Ce numéro n\'est pas inscrit. Créez votre espace sur la page Inscription.' };
  }
  if (String(client[5]).replace(/^'/, '') !== String(p.pin || '').trim()) {
    cache.put(cleEssais, String(essais + 1), 3600);
    return { ok: false, erreur: 'Code d\'accès incorrect.' };
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
    if (d.type === 'devis') return reponse_(recevoirDevis_(d));
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
      '\nVérifiez le SMS de réception (même montant, même TID), puis un clic suffit :\n' +
      '✅ Valider : ' + lienAction_('valider', feuille.getLastRow(), cleLigne_(numero, sms, lienCapture)) + '\n' +
      '❌ Refuser : ' + lienAction_('refuser', feuille.getLastRow(), cleLigne_(numero, sms, lienCapture)) + '\n' +
      '\n(Si ce n\'est pas du DEX, changez d\'abord le Service dans le tableau.)');

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
  traiterLigne_(feuille, e.range.getRow(), colonne === COL.STATUT);
}

/** Commission (DEX parrainé) et facture d'une ligne dont le statut vient d'être « Validé ». */
function traiterLigne_(feuille, ligne, statutModifie) {
  const valeurs = feuille.getRange(ligne, 1, 1, ENTETES_PAIEMENTS.length).getValues()[0];
  const service = valeurs[COL.SERVICE - 1];
  const valide = valeurs[COL.STATUT - 1] === 'Validé';

  if (service === 'DEX') {
    const cellule = feuille.getRange(ligne, COL.COMMISSION);
    if (valide && valeurs[COL.PARRAIN - 1]) cellule.setValue(CONFIG.COMMISSION_DEX); else cellule.clearContent();
  }
  if (valide && statutModifie && !valeurs[COL.FACTURE - 1]) {
    const lien = creerFacture_(valeurs);
    feuille.getRange(ligne, COL.FACTURE).setValue(lien);
  }
}

// ---------- Validation en un clic (liens de l'e-mail) ----------

function secretLiens_() {
  const proprietes = PropertiesService.getScriptProperties();
  let secret = proprietes.getProperty('secret_liens');
  if (!secret) {
    secret = Utilities.getUuid() + Utilities.getUuid();
    proprietes.setProperty('secret_liens', secret);
  }
  return secret;
}

/** Empreinte de la preuve (numéro + SMS + capture) : un lien ne marche que pour sa propre ligne. */
function cleLigne_(numero, sms, capture) {
  return normaliserNumero_(numero) + '|' + String(sms || '').trim() + '|' + String(capture || '');
}

/** Signature d'un lien : action + numéro de ligne + empreinte de la preuve. */
function signature_(action, ligne, cle) {
  const octets = Utilities.computeHmacSha256Signature(action + '|' + ligne + '|' + cle, secretLiens_());
  return octets.map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
}

function lienAction_(action, ligne, cle) {
  return ScriptApp.getService().getUrl() + '?action=' + action + '&l=' + ligne + '&s=' + signature_(action, ligne, cle);
}

function echapperHtml_(t) {
  return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
}

function pageHtml_(titre, corps) {
  return HtmlService.createHtmlOutput(
    '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<body style="font-family:Arial,sans-serif;max-width:480px;margin:24px auto;padding:0 16px;color:#111">' +
    '<h2>' + echapperHtml_(titre) + '</h2>' + corps + '</body>').setTitle('DWTS');
}

/** Retrouve la ligne d'un lien signé, ou null si le lien est faux ou la ligne a changé. */
function ligneDuLien_(p) {
  const feuille = SpreadsheetApp.getActive().getSheetByName(FEUILLE_PAIEMENTS);
  const ligne = Number(p.l);
  if (!ligne || ligne < 2 || ligne > feuille.getLastRow()) return null;
  const valeurs = feuille.getRange(ligne, 1, 1, ENTETES_PAIEMENTS.length).getValues()[0];
  const cle = cleLigne_(valeurs[COL.WHATSAPP - 1], valeurs[COL.SMS - 1], valeurs[COL.CAPTURE - 1]);
  if (signature_(p.action, ligne, cle) !== p.s) return null;
  return { feuille: feuille, ligne: ligne, valeurs: valeurs };
}

/** Page de confirmation affichée par le lien de l'e-mail (rien n'est modifié avant le bouton). */
function pageValidation_(p) {
  const cible = ligneDuLien_(p);
  if (!cible) return pageHtml_('Lien invalide', '<p>Ce lien n\'est pas valide ou la ligne a changé. Utilisez le tableau.</p>');
  const v = cible.valeurs;
  const statut = v[COL.STATUT - 1];
  const resume = '<p><b>' + (Number(v[COL.MONTANT - 1]) || '?') + ' XAF</b> · ' + echapperHtml_(v[COL.SERVICE - 1]) +
    '<br>Client : ' + echapperHtml_(String(v[COL.WHATSAPP - 1]).replace(/^\'/, '')) +
    '<br>TID : ' + echapperHtml_(v[COL.TID - 1] || '—') +
    '<br>Parrain : ' + echapperHtml_(v[COL.PARRAIN - 1] || '—') + '</p>';
  if (statut !== 'À vérifier') return pageHtml_('Déjà traité', resume + '<p>Statut actuel : <b>' + echapperHtml_(statut) + '</b>.</p>');
  const mot = p.action === 'valider' ? 'Valider' : 'Refuser';
  return pageHtml_(mot + ' ce paiement ?', resume +
    '<p>Vérifiez que le montant et le TID sont les mêmes que dans votre SMS de réception.</p>' +
    '<button id="b" style="font-size:18px;padding:14px 22px;border:0;border-radius:8px;background:' + (p.action === 'valider' ? '#1a7f37' : '#c0392b') + ';color:#fff"' +
    ' onclick="this.disabled=true;this.textContent=\'…\';google.script.run.withSuccessHandler(function(t){document.body.innerHTML=t}).confirmerLien_(' +
    JSON.stringify(p.action) + ',' + Number(p.l) + ',' + JSON.stringify(String(p.s)) + ')">' + mot + '</button>');
}

/** Appelée par le bouton de la page de confirmation. */
function confirmerLien_(action, ligne, sig) {
  const verrou = LockService.getScriptLock();
  verrou.waitLock(15000);
  try {
    const cible = ligneDuLien_({ action: action, l: ligne, s: sig });
    if (!cible) return '<h2>Lien invalide</h2>';
    if (cible.valeurs[COL.STATUT - 1] !== 'À vérifier') return '<h2>Déjà traité</h2>';
    const statut = action === 'valider' ? 'Validé' : 'Refusé';
    cible.feuille.getRange(cible.ligne, COL.STATUT).setValue(statut);
    if (statut === 'Validé') traiterLigne_(cible.feuille, cible.ligne, true);
    return '<h2>' + statut + ' ✓</h2>' + (statut === 'Validé' ? (emailDuClient_(cible.valeurs[COL.WHATSAPP - 1]) ?
      '<p>La facture a été envoyée par e-mail au client.</p>' :
      '<p>Ce client n\'a pas d\'e-mail enregistré : la facture vous est envoyée, à transférer sur WhatsApp.</p>') : '');
  } finally {
    verrou.releaseLock();
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
  const emailClient = emailDuClient_(telephone);
  if (emailClient) {
    // Facture envoyée directement au client (adresse donnée à l'inscription)
    MailApp.sendEmail(emailClient, 'DWTS : votre facture ' + numero + ' (' + montantTexte + ')',
      'Bonjour' + (client ? ' ' + client : '') + ',\n\nMerci pour votre paiement. Votre facture ' + numero + ' (' + montantTexte + ') est jointe à ce message.\n' +
      'Vous la retrouvez aussi dans votre espace client : ' + fichier.getUrl() + '\n\nDWTS - Digital World Technology Service',
      { attachments: [pdf], name: 'DWTS', replyTo: CONFIG.EMAIL_ALERTE });
  } else {
    // Client sans adresse e-mail connue : la facture vous revient, à transférer sur WhatsApp
    MailApp.sendEmail(CONFIG.EMAIL_ALERTE, 'DWTS : facture ' + numero + ' (' + montantTexte + ') : pas d\'e-mail client',
      'Ce client n\'a pas d\'adresse e-mail enregistrée. Transférez le PDF joint sur WhatsApp (' + telephone + ').\n' +
      fichier.getUrl(), { attachments: [pdf] });
  }
  return fichier.getUrl();
}

// ---------- Devis en ligne (Visuo et Logia) ----------

/** FAC- pour les factures, DEV-V-0001 / DEV-L-0001 pour les devis. */
function numeroDevis_(branche) {
  const proprietes = PropertiesService.getScriptProperties();
  const cle = 'devis_' + branche;
  const suivant = Number(proprietes.getProperty(cle) || 0) + 1;
  proprietes.setProperty(cle, String(suivant));
  return 'DEV-' + branche.charAt(0) + '-' + ('000' + suivant).slice(-4);
}

function formaterXaf_(n) {
  return Number(n).toLocaleString('fr-FR').replace(/\u202f|\u00a0/g, ' ') + ' XAF';
}

/**
 * Demande de devis envoyée par devis.html : { type:'devis', branche, nom, whatsapp, email, precisions, lignes:[{p, f, q}] }.
 * Les prix sont relus dans CATALOGUE_DEVIS (jamais ceux envoyés par la page).
 * Le devis PDF est créé, rangé dans Drive, noté dans la feuille Devis et envoyé par e-mail au client.
 */
function recevoirDevis_(d) {
  const branche = String(d.branche || '');
  const nom = String(d.nom || '').trim().slice(0, 80);
  const numero = normaliserNumero_(d.whatsapp);
  const email = String(d.email || '').trim().toLowerCase().slice(0, 120);
  const precisions = String(d.precisions || '').trim().slice(0, 500);
  if (['Visuo', 'Logia'].indexOf(branche) === -1) return { ok: false, erreur: 'Branche inconnue.' };
  if (!nom || !numero) return { ok: false, erreur: 'Nom ou numéro WhatsApp manquant.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, erreur: 'Adresse e-mail invalide.' };
  if (!Array.isArray(d.lignes) || !d.lignes.length || d.lignes.length > 20) return { ok: false, erreur: 'Choisissez entre 1 et 20 lignes.' };

  // Maximum 5 devis par heure et par numéro
  const cache = CacheService.getScriptCache();
  const cleCache = 'devis_' + numero;
  const faits = Number(cache.get(cleCache) || 0);
  if (faits >= 5) return { ok: false, erreur: 'Trop de demandes, réessayez dans une heure.' };
  cache.put(cleCache, String(faits + 1), 3600);

  const lignes = [];
  let unique = 0;
  let mensuel = 0;
  for (let i = 0; i < d.lignes.length; i++) {
    const demande = d.lignes[i] || {};
    const quantite = Math.floor(Number(demande.q));
    const trouve = CATALOGUE_DEVIS.filter(function (c) { return c[0] === branche && c[1] === demande.p && c[2] === demande.f; })[0];
    if (!trouve || !(quantite >= 1 && quantite <= 50)) return { ok: false, erreur: 'Une ligne du devis est invalide.' };
    const total = trouve[3] * quantite;
    lignes.push({ prestation: trouve[1], formule: trouve[2], prix: trouve[3], type: trouve[4], quantite: quantite, total: total });
    if (trouve[4] === 'Mensuel') mensuel += total; else unique += total;
  }

  const verrou = LockService.getScriptLock();
  verrou.waitLock(10000);
  let reference;
  try { reference = numeroDevis_(branche); } finally { verrou.releaseLock(); }

  const maintenant = new Date();
  const fuseau = Session.getScriptTimeZone();
  const couleur = CONFIG.COULEURS[branche];
  const date = Utilities.formatDate(maintenant, fuseau, 'dd/MM/yyyy');
  const validite = Utilities.formatDate(new Date(maintenant.getTime() + 15 * 86400000), fuseau, 'dd/MM/yyyy');
  const cellule = 'padding:6px;border-bottom:1px solid #e5e7eb;';
  const corps = lignes.map(function (l) {
    return '<tr><td style="' + cellule + '">' + echapperHtml_(l.prestation) + '</td>' +
      '<td style="' + cellule + '">' + echapperHtml_(l.formule) + (l.type === 'Mensuel' ? ' · mensuel' : '') + '</td>' +
      '<td style="' + cellule + 'text-align:right">' + l.quantite + '</td>' +
      '<td style="' + cellule + 'text-align:right">' + formaterXaf_(l.prix) + '</td>' +
      '<td style="' + cellule + 'text-align:right">' + formaterXaf_(l.total) + '</td></tr>';
  }).join('');
  const ligneTotal = function (titre, montant, fond) {
    return '<tr' + (fond ? ' style="background:' + couleur + ';color:#fff;font-weight:bold"' : '') + '><td colspan="4" style="padding:6px;text-align:right">' + titre +
      '</td><td style="padding:6px;text-align:right">' + formaterXaf_(montant) + '</td></tr>';
  };
  const conditions = branche === 'Visuo' ?
    'Paiement après validation de l\'aperçu, par Airtel Money (074 74 13 03) ou Mobicash (062 67 14 45). Les packs et la gestion se renouvellent chaque mois ; la publicité payante (Ads) n\'est pas comprise.' :
    'Mise en service après validation de la démonstration ; paiement par Airtel Money (074 74 13 03) ou Mobicash (062 67 14 45). Le suivi mensuel démarre le mois de la mise en service.';
  const html =
    '<html><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif;color:#111;margin:28px;font-size:12px">' +
    '<table style="width:100%"><tr><td>' + imageLogo_(branche, 64) + '</td><td style="text-align:right">' + imageLogo_('DWTS', 48) + '</td></tr></table>' +
    '<div style="font-weight:bold;margin-top:8px">DWTS · Digital World Technology Service</div>' +
    '<div style="color:#6b7280;font-size:10px;border-bottom:2px solid ' + couleur + ';padding-bottom:6px">Port-Gentil, Gabon · WhatsApp 062 67 14 45 · digitalwtservice@gmail.com</div>' +
    '<table style="width:100%;margin-top:14px"><tr><td><div style="color:' + couleur + ';font-weight:bold;font-size:10px">PRÉPARÉ POUR</div><b>' + echapperHtml_(nom) + '</b><br>' +
    echapperHtml_(numero) + '<br>' + echapperHtml_(email) + '</td>' +
    '<td style="text-align:right"><b>DEVIS N° <span style="color:' + couleur + '">' + reference + '</span></b><br>Date : ' + date + '<br>Valable jusqu\'au : ' + validite + '</td></tr></table>' +
    '<table style="width:100%;border-collapse:collapse;margin-top:14px"><tr style="background:#111827;color:#fff"><td style="padding:6px">Prestation</td><td style="padding:6px">Formule</td>' +
    '<td style="padding:6px;text-align:right">Qté</td><td style="padding:6px;text-align:right">Prix unitaire</td><td style="padding:6px;text-align:right">Total</td></tr>' + corps +
    ligneTotal('Total unique', unique, false) + ligneTotal('Total mensuel', mensuel, false) + ligneTotal('TOTAL À PAYER AU DÉMARRAGE', unique + mensuel, true) + '</table>' +
    (precisions ? '<p style="margin-top:12px"><b>Précisions :</b> ' + echapperHtml_(precisions) + '</p>' : '') +
    '<p style="color:#4b5563;font-size:10px;margin-top:14px">' + conditions + '</p>' +
    '<p style="text-align:center;color:' + couleur + ';font-weight:bold;margin-top:18px">Merci pour votre confiance !</p></body></html>';

  const pdf = HtmlService.createHtmlOutput(html).getBlob().getAs('application/pdf').setName(reference + '.pdf');
  const fichier = dossier_(CONFIG.DOSSIER_DEVIS).createFile(pdf);
  fichier.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  const resume = lignes.map(function (l) { return l.quantite + ' × ' + l.prestation + ' (' + l.formule + ')'; }).join(' ; ');
  SpreadsheetApp.getActive().getSheetByName(FEUILLE_DEVIS).appendRow([
    maintenant, reference, branche, "'" + numero, nom, email, resume, unique, mensuel, precisions, fichier.getUrl()]);

  MailApp.sendEmail(email, 'DWTS : votre devis ' + reference + ' (' + formaterXaf_(unique + mensuel) + ')',
    'Bonjour ' + nom + ',\n\nMerci pour votre demande. Votre devis ' + reference + ' est joint à ce message (valable 15 jours, jusqu\'au ' + validite + ').\n' +
    'Pour le valider ou le modifier, répondez à cet e-mail ou écrivez-nous sur WhatsApp au 062 67 14 45.\n\nDWTS - Digital World Technology Service',
    { attachments: [pdf], name: 'DWTS', replyTo: CONFIG.EMAIL_ALERTE });
  MailApp.sendEmail(CONFIG.EMAIL_ALERTE, 'DWTS : devis ' + reference + ' envoyé à ' + nom + ' (' + formaterXaf_(unique + mensuel) + ')',
    branche + ' · ' + nom + ' · ' + numero + ' · ' + email + '\n' + resume + (precisions ? '\nPrécisions : ' + precisions : '') + '\n' + fichier.getUrl());
  return { ok: true, reference: reference };
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

/** Adresse e-mail donnée à l'inscription (colonne G de Clients), ou '' si inconnue. */
function emailDuClient_(telephone) {
  const clients = SpreadsheetApp.getActive().getSheetByName(FEUILLE_CLIENTS);
  const numero = normaliserNumero_(telephone);
  if (!clients || clients.getLastRow() < 2 || !numero) return '';
  const lignes = clients.getRange(2, 1, clients.getLastRow() - 1, 7).getValues();
  for (let i = 0; i < lignes.length; i++) {
    if (normaliserNumero_(lignes[i][0]) === numero) {
      const email = String(lignes[i][6] || '').trim();
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
    }
  }
  return '';
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
