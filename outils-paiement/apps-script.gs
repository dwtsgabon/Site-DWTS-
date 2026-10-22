/**
 * DWTS : preuves de paiement, espace client (connexion durable, factures, photo, retraits) et commissions parrain.
 *
 * Le client envoie seulement son numéro WhatsApp + la capture OU le SMS de paiement collé.
 * Le code parrain est enregistré UNE fois, à l'inscription du client (feuille « Clients ») :
 * ensuite chaque paiement validé de ce client crédite son parrain automatiquement.
 *
 * À coller dans un Google Sheets (Extensions > Apps Script), puis :
 *   1. exécuter la fonction installer() une fois ;
 *   2. déployer en « Application Web » (accès : Tout le monde) ;
 *   3. copier l'adresse obtenue dans assets/js/config-espace.js.
 * Le détail est dans outils-paiement/README.md.
 * Après chaque paiement validé, une facture PDF au logo de la branche est créée et envoyée par e-mail.
 */

const CONFIG = {
  EMAIL_ALERTE: 'digitalwtservice@gmail.com', // reçoit les preuves de paiement et les demandes de retrait (rien d'autre)
  URL_SITE: 'https://dwtsgabon.github.io/Site-DWTS-/', // les liens de validation des e-mails ouvrent cette adresse
  DOSSIER_CAPTURES: 'DWTS - Preuves de paiement', // dossier Google Drive des captures
  COMMISSION_DEX: 500, // FCFA par commande DEX payée par un client parrainé
  SEUIL_VERSEMENT: 5000, // retrait possible dès ce solde
  RETRAIT_DERNIER_WEEKEND: true, // true : retraits seulement le dernier week-end du mois ; false : tous les jours
  DUREE_SESSION_JOURS: 30, // Mon espace reste connecté pendant cette durée
  FUSEAU: 'Africa/Libreville',
  CODE_DWTS: 'DWTS', // code maison : client sans parrain = commission gardée par DWTS
  DOSSIER_FACTURES: 'DWTS - Factures',
  DOSSIER_DEVIS: 'DWTS - Devis',
  DOSSIER_PHOTOS: 'DWTS - Photos clients',
  // Logos imprimés sur les factures (publiés avec le site)
  LOGOS: {
    DWTS: 'https://raw.githubusercontent.com/dwtsgabon/Site-DWTS-/main/assets/img/logo-dwts.png',
    DEX: 'https://raw.githubusercontent.com/dwtsgabon/Site-DWTS-/main/assets/img/logo-dex-facture.png',
    Visuo: 'https://raw.githubusercontent.com/dwtsgabon/Site-DWTS-/main/assets/img/logo-visuo.png',
    Logia: 'https://raw.githubusercontent.com/dwtsgabon/Site-DWTS-/main/assets/img/logo-logia.png'
  },
  COULEURS: { DEX: '#1E6FD9', Visuo: '#FF6A00', Logia: '#1E9FD9' }
};

const FEUILLE_PAIEMENTS = 'Paiements';
const FEUILLE_CLIENTS = 'Clients';
const FEUILLE_COMMISSIONS = 'Commissions';
const FEUILLE_VERSEMENTS = 'Versements';
const FEUILLE_DEVIS = 'Devis';
const ENTETES_DEVIS = ['Reçu le', 'N° devis', 'Branche', 'WhatsApp', 'Nom', 'Entreprise', 'E-mail', 'Lignes', 'Total unique (XAF)', 'Total mensuel (XAF)', 'Précisions', 'PDF'];

// Paiements : A Reçu le | B WhatsApp | C Service | D Montant | E TID | F SMS collé | G Capture
//             H Code parrain | I Statut | J Commission | K Mois | L Alerte | M Désignation | N Facture
const ENTETES_PAIEMENTS = ['Reçu le', 'WhatsApp', 'Service', 'Montant (XAF)', 'TID', 'SMS collé', 'Capture',
  'Code parrain', 'Statut', 'Commission (FCFA)', 'Mois', 'Alerte', 'Désignation (facture)', 'Facture'];
const COL = { WHATSAPP: 2, SERVICE: 3, MONTANT: 4, TID: 5, SMS: 6, CAPTURE: 7, PARRAIN: 8, STATUT: 9, COMMISSION: 10,
  DESIGNATION: 13, FACTURE: 14 };
// Clients : A WhatsApp | B Nom | C Code de son parrain | D Inscrit le | E Son code parrain | F Code d'accès | G E-mail | H Photo
const ENTETES_CLIENTS = ['WhatsApp', 'Nom', 'Code de son parrain', 'Inscrit le', 'Son code parrain', 'Code d\'accès', 'E-mail', 'Photo (Drive)'];
const CL = { WHATSAPP: 1, NOM: 2, PARRAIN: 3, INSCRIT: 4, CODE: 5, PIN: 6, EMAIL: 7, PHOTO: 8 };
const ENTETES_VERSEMENTS = ['Code parrain', 'Date', 'Montant versé (FCFA)', 'Note'];
// Retraits : demandés depuis Mon espace (montant = solde disponible, non modifiable)
const FEUILLE_RETRAITS = 'Retraits';
const ENTETES_RETRAITS = ['Demandé le', 'N° retrait', 'Code parrain', 'WhatsApp', 'Nom', 'Montant (XAF)', 'Statut', 'Traité le', 'Note'];
const RT = { DATE: 1, NUMERO: 2, CODE: 3, WHATSAPP: 4, NOM: 5, MONTANT: 6, STATUT: 7, TRAITE: 8, NOTE: 9 };
const STATUTS_RETRAIT = ['Approuvé', 'Versé', 'Annulé', 'Refusé'];
const STATUTS = ['À vérifier', 'Validé', 'Refusé'];
const SERVICES = ['DEX', 'Visuo', 'Logia'];

// DEBUT CATALOGUE (même liste que assets/js/catalogue-devis.js)
const CATALOGUE_DEVIS = [["Visuo","Logo","Basique",6500,"Unique"],["Visuo","Logo","Standard",10000,"Unique"],["Visuo","Logo","Premium",15000,"Unique"],["Visuo","Affiche ou flyer","Basique",2500,"Unique"],["Visuo","Affiche ou flyer","Standard",4000,"Unique"],["Visuo","Affiche ou flyer","Premium",6000,"Unique"],["Visuo","Carte d'invitation","Basique",2000,"Unique"],["Visuo","Carte d'invitation","Standard",3000,"Unique"],["Visuo","Carte d'invitation","Premium",5000,"Unique"],["Visuo","Carte de visite","Basique",2000,"Unique"],["Visuo","Carte de visite","Standard",3000,"Unique"],["Visuo","Carte de visite","Premium",5000,"Unique"],["Visuo","Vidéo publicitaire (à partir de 15 s, prix de départ)","Basique",7500,"Unique"],["Visuo","Vidéo publicitaire (à partir de 15 s, prix de départ)","Standard",9500,"Unique"],["Visuo","Vidéo publicitaire (à partir de 15 s, prix de départ)","Premium",15000,"Unique"],["Visuo","Site vitrine","Basique",12500,"Unique"],["Visuo","Site vitrine","Standard",25000,"Unique"],["Visuo","Site vitrine","Premium",45000,"Unique"],["Visuo","Maintenance du site","Basique",2500,"Mensuel"],["Visuo","Maintenance du site","Standard",5000,"Mensuel"],["Visuo","Maintenance du site","Premium",10000,"Mensuel"],["Visuo","Gestion de la page Facebook","Basique",7000,"Mensuel"],["Visuo","Gestion de la page Facebook","Standard",12500,"Mensuel"],["Visuo","Gestion de la page Facebook","Premium",22000,"Mensuel"],["Visuo","Gestion du compte Instagram","Basique",8000,"Mensuel"],["Visuo","Gestion du compte Instagram","Standard",14000,"Mensuel"],["Visuo","Gestion du compte Instagram","Premium",24500,"Mensuel"],["Visuo","Gestion du compte WhatsApp Business","Basique",6500,"Mensuel"],["Visuo","Gestion du compte WhatsApp Business","Standard",11500,"Mensuel"],["Visuo","Gestion du compte WhatsApp Business","Premium",20500,"Mensuel"],["Visuo","Pack Starter (Facebook ; 1 affiche, 4 publications)","Pack",6000,"Mensuel"],["Visuo","Pack Basique (Facebook + WhatsApp Business ; 2 affiches, 8 publications, 1 vidéo)","Pack",18000,"Mensuel"],["Visuo","Pack Standard (Facebook + Instagram + WhatsApp Business ; 4 affiches, 12 publications, 2 vidéos, maintenance du site)","Pack",50000,"Mensuel"],["Visuo","Pack Premium (Facebook + Instagram + WhatsApp Business ; 6 affiches, 20 publications, 4 vidéos, maintenance du site)","Pack",115000,"Mensuel"],["Visuo","Pack Vitrine (site vitrine Basique + 1er mois du Pack Basique, puis 18 000 / mois)","Pack",28000,"Unique"],["Logia","Automatisation","Basique",7500,"Unique"],["Logia","Automatisation","Standard",15000,"Unique"],["Logia","Automatisation","Premium",30000,"Unique"],["Logia","Bot WhatsApp","Basique",15000,"Unique"],["Logia","Bot WhatsApp","Standard",30000,"Unique"],["Logia","Bot WhatsApp","Premium",60000,"Unique"],["Logia","Logiciel de gestion","Basique",45000,"Unique"],["Logia","Logiciel de gestion","Standard",90000,"Unique"],["Logia","Logiciel de gestion","Premium",180000,"Unique"],["Logia","Suivi","Basique",5000,"Mensuel"],["Logia","Suivi","Standard",10000,"Mensuel"],["Logia","Suivi","Premium",20000,"Mensuel"],["Logia","Pack Starter : mise en service","Pack",7500,"Unique"],["Logia","Pack Starter : suivi","Pack",5000,"Mensuel"],["Logia","Pack Business : mise en service","Pack",40000,"Unique"],["Logia","Pack Business : suivi","Pack",10000,"Mensuel"],["Logia","Pack Entreprise : mise en service","Pack",110000,"Unique"],["Logia","Pack Entreprise : suivi","Pack",20000,"Mensuel"]];
// FIN CATALOGUE


/** Crée les feuilles, les listes, les dossiers et le tableau de bord. À relancer après chaque mise à jour du script. */
function installer() {
  const classeur = SpreadsheetApp.getActive();

  const paiements = feuille_(FEUILLE_PAIEMENTS, ENTETES_PAIEMENTS);
  paiements.getRange(2, COL.STATUT, 1000, 1)
    .setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(STATUTS, true).build());
  paiements.getRange(2, COL.SERVICE, 1000, 1)
    .setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(SERVICES, true).build());

  const clients = feuille_(FEUILLE_CLIENTS, ENTETES_CLIENTS);
  clients.getRange('A:A').setNumberFormat('@'); // garder le 0 devant les numéros
  clients.getRange('F:F').setNumberFormat('@');

  feuille_(FEUILLE_VERSEMENTS, ENTETES_VERSEMENTS);
  const devis = feuille_(FEUILLE_DEVIS, ENTETES_DEVIS);
  devis.getRange('D:D').setNumberFormat('@');
  const retraits = feuille_(FEUILLE_RETRAITS, ENTETES_RETRAITS);
  retraits.getRange('D:D').setNumberFormat('@');
  retraits.getRange(2, RT.STATUT, 1000, 1)
    .setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(STATUTS_RETRAIT, true).build());

  // Séparateur d'arguments : « ; » si le tableau est en français (ou autre langue à virgule décimale), « , » sinon
  const sep = /^en/i.test(classeur.getSpreadsheetLocale()) ? ',' : ';';
  const synthese = construireCommissions_(classeur, sep);

  [CONFIG.DOSSIER_CAPTURES, CONFIG.DOSSIER_FACTURES, CONFIG.DOSSIER_DEVIS, CONFIG.DOSSIER_PHOTOS].forEach(dossier_);
  secretLiens_();

  // Mise en forme des feuilles et tableau de bord (couleurs, graphiques)
  styliserFeuilles_(classeur, synthese);
  creerTableauDeBord_(classeur, sep);

  // Déclencheur « à la modification » autorisé (nécessaire pour créer les factures PDF)
  ScriptApp.getProjectTriggers()
    .filter(function (d) { return d.getHandlerFunction() === 'surModification'; })
    .forEach(function (d) { ScriptApp.deleteTrigger(d); });
  ScriptApp.newTrigger('surModification').forSpreadsheet(classeur).onEdit().create();
}

/** Feuille existante, ou créée avec ses en-têtes (le script ne plante plus si installer n'a pas été relancé). */
function feuille_(nom, entetes) {
  const classeur = SpreadsheetApp.getActive();
  let feuille = classeur.getSheetByName(nom);
  if (!feuille) feuille = classeur.insertSheet(nom);
  const actuelles = feuille.getRange(1, 1, 1, entetes.length).getValues()[0];
  if (actuelles.join('|') !== entetes.join('|')) {
    feuille.getRange(1, 1, 1, entetes.length).setValues([entetes]).setFontWeight('bold');
    feuille.setFrozenRows(1);
  }
  return feuille;
}

/**
 * Feuille « Commissions » : 3 tableaux mis en forme.
 *   A:C  commissions par mois et par parrain · E:H  solde par parrain (gagné, versé, reste)
 *   J:L  commissions DWTS (gardées) · N  total DWTS
 */
function construireCommissions_(classeur, sep) {
  const f = function (formule) { return sep === ';' ? formule : formule.replace(/;/g, ','); };
  const s = classeur.getSheetByName(FEUILLE_COMMISSIONS) || classeur.insertSheet(FEUILLE_COMMISSIONS);
  s.clear();
  s.clearConditionalFormatRules();
  s.getBandings().forEach(function (b) { b.remove(); });
  if (s.getMaxColumns() < 14) s.insertColumnsAfter(s.getMaxColumns(), 14 - s.getMaxColumns());
  s.setHiddenGridlines(true);
  const DW = CONFIG.CODE_DWTS;
  const P = FEUILLE_PAIEMENTS;

  s.getRange('A1:N1').merge().setValue('Commissions des parrains · versement dès ' + formaterXaf_(CONFIG.SEUIL_VERSEMENT))
    .setBackground(THEME.marine).setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(14).setFontFamily('Raleway');
  s.setRowHeight(1, 40);
  [['A3', 'Par mois et par parrain'], ['E3', 'Solde par parrain'], ['J3', 'Commissions DWTS (gardées)'], ['N3', 'Total DWTS']]
    .forEach(function (t) { s.getRange(t[0]).setValue(t[1]).setFontColor(THEME.orange).setFontWeight('bold').setFontSize(12); });

  s.getRange('A4').setFormula(f('=IFERROR(QUERY(' + P + '!A2:L;"select K, H, sum(J) where I = \'Validé\' and H <> \'\' and H <> \'' + DW +
    '\' and J > 0 group by K, H order by K desc label K \'Mois\', H \'Parrain\', sum(J) \'Total\'";0);"Aucune commission")'));
  s.getRange('E4').setFormula(f('=IFERROR(QUERY(' + P + '!A2:L;"select H, sum(J) where I = \'Validé\' and H <> \'\' and H <> \'' + DW +
    '\' and J > 0 group by H order by sum(J) desc label H \'Parrain\', sum(J) \'Gagné\'";0);"Aucun parrain")'));
  s.getRange('G4:H4').setValues([['Versé', 'Reste à verser']]);
  s.getRange('G5').setFormula(f('=ARRAYFORMULA(IF(E5:E="";;SUMIF(' + FEUILLE_VERSEMENTS + '!A:A;E5:E;' + FEUILLE_VERSEMENTS + '!C:C)))'));
  s.getRange('H5').setFormula(f('=ARRAYFORMULA(IF(E5:E="";;F5:F-G5:G))'));
  s.getRange('J4').setFormula(f('=IFERROR(QUERY(' + P + '!A2:L;"select K, count(J), sum(J) where I = \'Validé\' and H = \'' + DW +
    '\' and J > 0 group by K order by K desc label K \'Mois\', count(J) \'Commandes\', sum(J) \'Total\'";0);"Aucune commission")'));
  s.getRange('N4').setFormula(f('=SUMIFS(' + P + '!J:J;' + P + '!I:I;"Validé";' + P + '!H:H;"' + DW + '")'));

  // Mise en forme : en-têtes marine, lignes alternées seulement là où il y a des données, montants en XAF
  const xaf = '#,##0 "XAF"';
  ['A4:C4', 'E4:H4', 'J4:L4'].forEach(function (a1) {
    s.getRange(a1).setBackground(THEME.marine).setFontColor('#FFFFFF').setFontWeight('bold').setHorizontalAlignment('center');
  });
  s.setRowHeight(4, 30);
  s.getRange('C5:C500').setNumberFormat(xaf);
  s.getRange('F5:H500').setNumberFormat(xaf);
  s.getRange('L5:L500').setNumberFormat(xaf);
  s.getRange('N4').setNumberFormat(xaf).setFontSize(16).setFontWeight('bold').setFontColor('#1A7F37')
    .setBackground(THEME.carte).setHorizontalAlignment('center');
  s.getRange('A1:N500').setFontFamily(THEME.police).setVerticalAlignment('middle');
  s.getRange('A1').setFontFamily('Raleway');
  const regles = [];
  [['A5:C500', '$A5'], ['E5:H500', '$E5'], ['J5:L500', '$J5']].forEach(function (t) {
    const plage = s.getRange(t[0]);
    regles.push(SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=AND(' + t[1] + '<>"",ISEVEN(ROW()))'.replace(/,/g, sep))
      .setBackground(THEME.carte).setRanges([plage]).build());
    regles.push(SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=AND(' + t[1] + '<>"",ISODD(ROW()))'.replace(/,/g, sep))
      .setBackground('#FFFFFF').setRanges([plage]).build());
  });
  // Reste à verser au-dessus du seuil : en rouge gras (à payer)
  regles.push(SpreadsheetApp.newConditionalFormatRule().whenNumberGreaterThanOrEqualTo(CONFIG.SEUIL_VERSEMENT)
    .setFontColor('#C0392B').setBold(true).setRanges([s.getRange('H5:H500')]).build());
  s.setConditionalFormatRules(regles);
  s.setColumnWidth(1, 110); s.setColumnWidth(2, 130); s.setColumnWidth(3, 120);
  s.setColumnWidth(4, 24);
  s.setColumnWidth(5, 130); s.setColumnWidths(6, 3, 120);
  s.setColumnWidth(9, 24);
  s.setColumnWidth(10, 110); s.setColumnWidth(11, 110); s.setColumnWidth(12, 120);
  s.setColumnWidth(13, 24); s.setColumnWidth(14, 150);
  s.setFrozenRows(4);
  return s;
}

/** Lien GET (anciennes pages, anciens e-mails). Les pages du site passent par doPost. */
function doGet(e) {
  const p = e.parameter || {};
  if (p.action === 'valider' || p.action === 'refuser') {
    // Anciens e-mails : renvoie vers la page de validation du site
    const lien = CONFIG.URL_SITE + 'validation.html?t=paiement&a=' + encodeURIComponent(p.action) + '&l=' + encodeURIComponent(p.l) + '&s=' + encodeURIComponent(p.s);
    return pageHtml_('Validation', '<p><a href="' + echapperHtml_(lien) + '" target="_top" style="font-size:18px">Ouvrir la page de validation</a></p>');
  }
  return reponse_(api_(p));
}

/** Toutes les actions JSON de l'espace client (appelées par le site, en POST ou en GET). */
function api_(p) {
  try {
    switch (p.action) {
      case 'inscription': return inscrire_(p);
      case 'connexion': return connecter_(p);
      case 'espace': return espaceParJeton_(p);
      case 'facture': return telechargerFacture_(p);
      case 'photo': return changerPhoto_(p);
      case 'pin': return changerPin_(p);
      case 'profil': return changerProfil_(p);
      case 'retrait': return demanderRetrait_(p);
      case 'infoValidation': return infoValidation_(p);
      case 'confirmerValidation': return confirmerValidation_(p);
      default: return { ok: false, erreur: 'Action inconnue' };
    }
  } catch (erreur) {
    console.error(erreur);
    return { ok: false, erreur: 'Une erreur est survenue, réessayez plus tard.' };
  }
}

// ---------- Clients et sessions ----------

function lireClients_() {
  const feuille = feuille_(FEUILLE_CLIENTS, ENTETES_CLIENTS);
  const lignes = feuille.getLastRow() > 1 ? feuille.getRange(2, 1, feuille.getLastRow() - 1, ENTETES_CLIENTS.length).getValues() : [];
  return { feuille: feuille, lignes: lignes };
}

/** { feuille, ligne (n° de ligne), v (valeurs) } du client, ou null. */
function trouverClient_(numero) {
  const c = lireClients_();
  for (let i = 0; i < c.lignes.length; i++) {
    if (normaliserNumero_(c.lignes[i][CL.WHATSAPP - 1]) === numero) return { feuille: c.feuille, ligne: i + 2, v: c.lignes[i], tous: c.lignes };
  }
  return null;
}

function pinDe_(client) { return String(client.v[CL.PIN - 1]).replace(/^'/, '').trim(); }

/** Jeton de session signé : numéro.expiration.signature (changer le code d'accès invalide les anciens jetons). */
function creerJeton_(numero, pin) {
  const expiration = Date.now() + CONFIG.DUREE_SESSION_JOURS * 86400000;
  return numero + '.' + expiration + '.' + signatureSession_(numero, expiration, pin);
}

function signatureSession_(numero, expiration, pin) {
  return signature_('session', numero + '|' + expiration, pin).slice(0, 40);
}

/** Client correspondant à un jeton valide, ou null. */
function clientDuJeton_(jeton) {
  const morceaux = String(jeton || '').split('.');
  if (morceaux.length !== 3) return null;
  const numero = normaliserNumero_(morceaux[0]);
  const expiration = Number(morceaux[1]);
  if (!numero || !(expiration > Date.now())) return null;
  const client = trouverClient_(numero);
  if (!client || signatureSession_(numero, expiration, pinDe_(client)) !== morceaux[2]) return null;
  client.numero = numero;
  return client;
}

const SESSION_EXPIREE = { ok: false, session: false, erreur: 'Votre session a expiré. Reconnectez-vous.' };

/** Inscription unique : code parrain personnel, code d'accès choisi, et connexion directe à Mon espace. */
function inscrire_(p) {
  const numero = normaliserNumero_(p.whatsapp);
  const nom = String(p.nom || '').trim().slice(0, 80);
  if (!nom || !numero) return { ok: false, erreur: 'Indiquez votre nom et un numéro WhatsApp valide.' };
  const email = String(p.email || '').trim().toLowerCase().slice(0, 120);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, erreur: 'Indiquez une adresse e-mail valide.' };
  const pin = String(p.pin || '').trim();
  if (!/^[0-9]{4,6}$/.test(pin)) return { ok: false, erreur: 'Le code d\'accès doit avoir 4 à 6 chiffres.' };

  const verrou = LockService.getScriptLock();
  verrou.waitLock(10000);
  try {
    const c = lireClients_();
    if (c.lignes.some(function (l) { return normaliserNumero_(l[0]) === numero; })) {
      return { ok: false, erreur: 'Ce numéro est déjà inscrit. Connectez-vous, ou écrivez-nous si vous avez oublié votre code.' };
    }
    // Sans code parrain : le code maison DWTS est mis automatiquement
    const parrain = String(p.parrain || '').trim().toUpperCase() || CONFIG.CODE_DWTS;
    if (parrain !== CONFIG.CODE_DWTS && !c.lignes.some(function (l) { return String(l[CL.CODE - 1]).toUpperCase() === parrain; })) {
      return { ok: false, erreur: 'Code parrain introuvable. Vérifiez-le, ou laissez la case vide.' };
    }
    const proprietes = PropertiesService.getScriptProperties();
    const suivant = Number(proprietes.getProperty('compteur_parrain') || 0) + 1;
    proprietes.setProperty('compteur_parrain', String(suivant));
    const code = 'PARRAIN-' + ('00' + suivant).slice(-3);
    c.feuille.appendRow(["'" + numero, nom, parrain, new Date(), code, "'" + pin, email, '']);
  } finally {
    verrou.releaseLock();
  }
  // Pas d'e-mail d'alerte : l'inscription se voit dans la feuille Clients et le tableau de bord
  const client = trouverClient_(numero);
  client.numero = numero;
  const donnees = donneesEspace_(client);
  donnees.jeton = creerJeton_(numero, pin);
  return donnees;
}

/** Connexion avec numéro + code d'accès : renvoie un jeton valable CONFIG.DUREE_SESSION_JOURS jours. */
function connecter_(p) {
  const numero = normaliserNumero_(p.whatsapp);
  if (!numero) return { ok: false, erreur: 'Numéro WhatsApp invalide.' };
  const cache = CacheService.getScriptCache();
  const cleEssais = 'essais_' + numero;
  const essais = Number(cache.get(cleEssais) || 0);
  if (essais >= 5) return { ok: false, erreur: 'Trop d\'essais. Réessayez dans une heure ou écrivez-nous.' };
  const client = trouverClient_(numero);
  if (!client) return { ok: false, erreur: 'Ce numéro n\'est pas inscrit. Créez votre espace sur la page Inscription.' };
  if (pinDe_(client) !== String(p.pin || '').trim()) {
    cache.put(cleEssais, String(essais + 1), 3600);
    return { ok: false, erreur: 'Code d\'accès incorrect.' };
  }
  cache.remove(cleEssais);
  client.numero = numero;
  const donnees = donneesEspace_(client);
  donnees.jeton = creerJeton_(numero, pinDe_(client));
  return donnees;
}

function espaceParJeton_(p) {
  const client = clientDuJeton_(p.jeton);
  return client ? donneesEspace_(client) : SESSION_EXPIREE;
}

/** Gains, versements et retraits d'un parrain. solde = gagné − versé − retrait approuvé en attente. */
function comptesParrain_(code) {
  const classeur = SpreadsheetApp.getActive();
  const paiements = classeur.getSheetByName(FEUILLE_PAIEMENTS);
  const donnees = paiements && paiements.getLastRow() > 1 ? paiements.getRange(2, 1, paiements.getLastRow() - 1, ENTETES_PAIEMENTS.length).getValues() : [];
  const parMois = {};
  let gains = 0;
  donnees.forEach(function (l) {
    if (code && String(l[COL.PARRAIN - 1]).toUpperCase() === code && l[COL.STATUT - 1] === 'Validé') {
      const gain = Number(l[COL.COMMISSION - 1]) || 0;
      const mois = String(l[10] || '').replace(/^'/, '');
      parMois[mois] = parMois[mois] || { mois: mois, commandes: 0, gains: 0 };
      parMois[mois].commandes += 1;
      parMois[mois].gains += gain;
      gains += gain;
    }
  });
  const versements = classeur.getSheetByName(FEUILLE_VERSEMENTS);
  const verse = versements && versements.getLastRow() > 1 ?
    versements.getRange(2, 1, versements.getLastRow() - 1, 3).getValues()
      .filter(function (l) { return String(l[0]).toUpperCase() === code; })
      .reduce(function (total, l) { return total + (Number(l[2]) || 0); }, 0) : 0;
  const retraits = classeur.getSheetByName(FEUILLE_RETRAITS);
  const lignesRetraits = retraits && retraits.getLastRow() > 1 ? retraits.getRange(2, 1, retraits.getLastRow() - 1, ENTETES_RETRAITS.length).getValues() : [];
  const fuseau = CONFIG.FUSEAU;
  const mesRetraits = [];
  let enCours = 0;
  lignesRetraits.forEach(function (l) {
    if (String(l[RT.CODE - 1]).toUpperCase() !== code) return;
    if (l[RT.STATUT - 1] === 'Approuvé') enCours += Number(l[RT.MONTANT - 1]) || 0;
    mesRetraits.push({
      date: l[0] instanceof Date ? Utilities.formatDate(l[0], fuseau, 'dd/MM/yyyy') : String(l[0]),
      numero: l[RT.NUMERO - 1], montant: Number(l[RT.MONTANT - 1]) || 0, statut: l[RT.STATUT - 1], note: l[RT.NOTE - 1]
    });
  });
  return {
    commissions: Object.keys(parMois).sort().reverse().map(function (m) { return parMois[m]; }),
    gainsTotal: gains, verse: verse, enCours: enCours, solde: Math.max(0, gains - verse - enCours),
    retraits: mesRetraits.reverse()
  };
}

/** Tout ce qu'affiche Mon espace. */
function donneesEspace_(client) {
  const numero = client.numero;
  const code = String(client.v[CL.CODE - 1]).toUpperCase();
  const fuseau = CONFIG.FUSEAU;
  const date = function (d) { return d instanceof Date ? Utilities.formatDate(d, fuseau, 'dd/MM/yyyy') : String(d || ''); };

  const feuille = SpreadsheetApp.getActive().getSheetByName(FEUILLE_PAIEMENTS);
  const donnees = feuille && feuille.getLastRow() > 1 ? feuille.getRange(2, 1, feuille.getLastRow() - 1, ENTETES_PAIEMENTS.length).getValues() : [];
  const paiements = [];
  let depense = 0;
  donnees.forEach(function (l, i) {
    if (normaliserNumero_(l[COL.WHATSAPP - 1]) !== numero) return;
    const valide = l[COL.STATUT - 1] === 'Validé';
    if (valide) depense += Number(l[COL.MONTANT - 1]) || 0;
    paiements.push({
      id: i + 2, date: date(l[0]), service: l[COL.SERVICE - 1], designation: l[COL.DESIGNATION - 1] || '',
      montant: Number(l[COL.MONTANT - 1]) || 0, statut: l[COL.STATUT - 1], facture: valide && !!l[COL.FACTURE - 1]
    });
  });

  const tous = client.tous || lireClients_().lignes;
  const filleuls = tous.filter(function (l) { return code && String(l[CL.PARRAIN - 1]).toUpperCase() === code; })
    .map(function (l) {
      const mots = String(l[CL.NOM - 1]).trim().split(/\s+/);
      return { nom: mots[0] + (mots[1] ? ' ' + mots[1].charAt(0).toUpperCase() + '.' : ''), date: date(l[CL.INSCRIT - 1]) };
    }).reverse();

  const comptes = comptesParrain_(code);
  const fenetre = fenetreRetrait_(new Date());
  return {
    ok: true, nom: client.v[CL.NOM - 1], code: code, whatsapp: numero, email: client.v[CL.EMAIL - 1] || '',
    inscritLe: date(client.v[CL.INSCRIT - 1]), photo: photoDataUrl_(client.v[CL.PHOTO - 1]),
    paiements: paiements.reverse(), totalDepense: depense,
    filleuls: filleuls, commissions: comptes.commissions,
    gainsTotal: comptes.gainsTotal, verse: comptes.verse, enCours: comptes.enCours, solde: comptes.solde,
    retraits: comptes.retraits,
    retrait: { ouvert: fenetre.ouvert, prochaine: fenetre.prochaine, seuil: CONFIG.SEUIL_VERSEMENT }
  };
}

/** Facture PDF renvoyée au site (le client la télécharge sans passer par Google Drive). */
function telechargerFacture_(p) {
  const client = clientDuJeton_(p.jeton);
  if (!client) return SESSION_EXPIREE;
  const feuille = SpreadsheetApp.getActive().getSheetByName(FEUILLE_PAIEMENTS);
  const ligne = Number(p.id);
  if (!ligne || ligne < 2 || ligne > feuille.getLastRow()) return { ok: false, erreur: 'Facture introuvable.' };
  const v = feuille.getRange(ligne, 1, 1, ENTETES_PAIEMENTS.length).getValues()[0];
  if (normaliserNumero_(v[COL.WHATSAPP - 1]) !== client.numero || v[COL.STATUT - 1] !== 'Validé') return { ok: false, erreur: 'Facture introuvable.' };
  const id = idDrive_(v[COL.FACTURE - 1]);
  if (!id) return { ok: false, erreur: 'Facture pas encore prête.' };
  const fichier = DriveApp.getFileById(id);
  return { ok: true, nom: fichier.getName(), pdf: Utilities.base64Encode(fichier.getBlob().getBytes()) };
}

function idDrive_(lien) {
  const m = String(lien || '').match(/\/d\/([\w-]{20,})/) || String(lien || '').match(/[?&]id=([\w-]{20,})/);
  return m ? m[1] : '';
}

function photoDataUrl_(id) {
  if (!id) return '';
  try {
    const blob = DriveApp.getFileById(String(id)).getBlob();
    return 'data:' + blob.getContentType() + ';base64,' + Utilities.base64Encode(blob.getBytes());
  } catch (erreur) {
    return '';
  }
}

/** Photo de profil (JPEG déjà réduite par la page), rangée dans DWTS - Photos clients. */
function changerPhoto_(p) {
  const client = clientDuJeton_(p.jeton);
  if (!client) return SESSION_EXPIREE;
  const image = String(p.image || '');
  if (!image || image.length > 400000) return { ok: false, erreur: 'Image trop lourde.' };
  const fichier = dossier_(CONFIG.DOSSIER_PHOTOS).createFile(
    Utilities.newBlob(Utilities.base64Decode(image), 'image/jpeg', client.numero + '.jpg'));
  const ancien = client.v[CL.PHOTO - 1];
  if (ancien) { try { DriveApp.getFileById(String(ancien)).setTrashed(true); } catch (erreur) { /* déjà supprimée */ } }
  client.feuille.getRange(client.ligne, CL.PHOTO).setValue(fichier.getId());
  return { ok: true, photo: 'data:image/jpeg;base64,' + image };
}

/** Nouveau code d'accès : les autres appareils sont déconnectés, celui-ci reçoit un nouveau jeton. */
function changerPin_(p) {
  const client = clientDuJeton_(p.jeton);
  if (!client) return SESSION_EXPIREE;
  if (pinDe_(client) !== String(p.ancien || '').trim()) return { ok: false, erreur: 'Code d\'accès actuel incorrect.' };
  const nouveau = String(p.nouveau || '').trim();
  if (!/^[0-9]{4,6}$/.test(nouveau)) return { ok: false, erreur: 'Le nouveau code doit avoir 4 à 6 chiffres.' };
  client.feuille.getRange(client.ligne, CL.PIN).setValue("'" + nouveau);
  return { ok: true, jeton: creerJeton_(client.numero, nouveau) };
}

/** Modifier l'adresse e-mail (les factures y sont envoyées). */
function changerProfil_(p) {
  const client = clientDuJeton_(p.jeton);
  if (!client) return SESSION_EXPIREE;
  const email = String(p.email || '').trim().toLowerCase().slice(0, 120);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, erreur: 'Adresse e-mail invalide.' };
  client.feuille.getRange(client.ligne, CL.EMAIL).setValue(email);
  return { ok: true, email: email };
}

// ---------- Retraits des parrains ----------

const MOIS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/** Dernier samedi du mois (date UTC à minuit). mois : 1 à 12. */
function dernierSamedi_(annee, mois) {
  const dernierJour = new Date(Date.UTC(annee, mois, 0));
  const ecart = (dernierJour.getUTCDay() + 1) % 7; // jours à reculer jusqu'au samedi
  return Date.UTC(annee, mois - 1, dernierJour.getUTCDate() - ecart);
}

/** Retraits ouverts le dernier week-end du mois (samedi + dimanche), heure de Libreville. */
function fenetreRetrait_(maintenant) {
  if (!CONFIG.RETRAIT_DERNIER_WEEKEND) return { ouvert: true, prochaine: '' };
  const morceaux = Utilities.formatDate(maintenant, CONFIG.FUSEAU, 'yyyy-M-d').split('-').map(Number);
  const a = morceaux[0], m = morceaux[1];
  const jour = Date.UTC(a, m - 1, morceaux[2]);
  const ce = dernierSamedi_(a, m);
  const precedent = m === 1 ? dernierSamedi_(a - 1, 12) : dernierSamedi_(a, m - 1);
  const ouvert = jour === ce || jour === ce + 86400000 || jour === precedent + 86400000;
  const prochain = jour <= ce + 86400000 ? ce : (m === 12 ? dernierSamedi_(a + 1, 1) : dernierSamedi_(a, m + 1));
  const samedi = new Date(prochain);
  const dimanche = new Date(prochain + 86400000);
  const memeMois = samedi.getUTCMonth() === dimanche.getUTCMonth();
  return {
    ouvert: ouvert,
    prochaine: 'samedi ' + samedi.getUTCDate() + (memeMois ? '' : ' ' + MOIS_FR[samedi.getUTCMonth()]) +
      ' et dimanche ' + dimanche.getUTCDate() + ' ' + MOIS_FR[dimanche.getUTCMonth()]
  };
}

/**
 * Bouton « Demander mon retrait » : le montant est le solde disponible, calculé ici (rien n'est modifiable).
 * Solde insuffisant : demande « Annulé ». Sinon « Approuvé » (versement sous 48 h) et e-mail avec un lien « Versé ».
 */
function demanderRetrait_(p) {
  const client = clientDuJeton_(p.jeton);
  if (!client) return SESSION_EXPIREE;
  const code = String(client.v[CL.CODE - 1]).toUpperCase();
  const fenetre = fenetreRetrait_(new Date());
  if (!fenetre.ouvert) return { ok: false, erreur: 'Les retraits se font le dernier week-end du mois. Prochaine date : ' + fenetre.prochaine + '.' };

  const verrou = LockService.getScriptLock();
  verrou.waitLock(15000);
  let resultat;
  try {
    const comptes = comptesParrain_(code);
    if (comptes.enCours > 0) return { ok: false, erreur: 'Une demande de retrait est déjà en cours de versement.' };
    const feuille = feuille_(FEUILLE_RETRAITS, ENTETES_RETRAITS);
    const proprietes = PropertiesService.getScriptProperties();
    const suivant = Number(proprietes.getProperty('compteur_retrait') || 0) + 1;
    proprietes.setProperty('compteur_retrait', String(suivant));
    const reference = 'RET-' + ('000' + suivant).slice(-4);
    const montant = comptes.solde;
    const suffisant = montant >= CONFIG.SEUIL_VERSEMENT;
    const statut = suffisant ? 'Approuvé' : 'Annulé';
    const note = suffisant ? 'Versement sous 48 h' : 'Solde insuffisant (minimum ' + formaterXaf_(CONFIG.SEUIL_VERSEMENT) + ')';
    feuille.appendRow([new Date(), reference, code, "'" + client.numero, client.v[CL.NOM - 1], montant, statut, suffisant ? '' : new Date(), note]);
    resultat = { ok: true, statut: statut, reference: reference, montant: montant, ligne: feuille.getLastRow() };
  } finally {
    verrou.releaseLock();
  }
  if (resultat.statut === 'Approuvé') {
    const cle = cleRetrait_(resultat.reference, code, resultat.montant);
    MailApp.sendEmail(CONFIG.EMAIL_ALERTE, 'DWTS : retrait ' + resultat.reference + ' à verser (' + formaterXaf_(resultat.montant) + ')',
      'Parrain : ' + client.v[CL.NOM - 1] + ' (' + code + ')\nMobile Money : ' + client.numero + '\nMontant : ' + formaterXaf_(resultat.montant) +
      ' (solde calculé par le script, non modifiable)\n\nÀ verser sous 48 h, puis un clic :\n' +
      '✅ Versé : ' + lienValidation_('retrait', 'verse', resultat.ligne, cle) + '\n' +
      '❌ Refuser : ' + lienValidation_('retrait', 'refuser', resultat.ligne, cle) + '\n');
  }
  delete resultat.ligne;
  return resultat;
}

function cleRetrait_(reference, code, montant) {
  return String(reference) + '|' + String(code).toUpperCase() + '|' + Number(montant);
}

/** Reçoit une preuve envoyée depuis paiement.html : { whatsapp, sms?, capture? (base64 JPEG) }. */
function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    if (d.type === 'devis') return reponse_(recevoirDevis_(d));
    if (d.action) return reponse_(api_(d)); // espace client, retraits, validation
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
    const feuille = feuille_(FEUILLE_PAIEMENTS, ENTETES_PAIEMENTS);
    const alerte = lu.tid && tidDejaVu_(feuille, lu.tid) ? 'TID déjà envoyé : vérifier' : '';
    const parrain = parrainDuClient_(numero) || CONFIG.CODE_DWTS; // client non inscrit ou sans parrain : DWTS

    feuille.appendRow([
      maintenant, "'" + numero, 'DEX', lu.montant || '', lu.tid, sms, lienCapture,
      parrain, 'À vérifier', '', "'" + Utilities.formatDate(maintenant, fuseau, 'yyyy-MM'), alerte, '', ''
    ]);

    MailApp.sendEmail(CONFIG.EMAIL_ALERTE,
      'DWTS : nouvelle preuve de paiement' + (lu.montant ? ' (' + lu.montant + ' XAF)' : ''),
      'Client : ' + numero + (parrain ? ' (parrain ' + parrain + ')' : '') + '\n' +
      (sms ? 'SMS collé : ' + sms + '\n' : '') +
      (lienCapture ? 'Capture : ' + lienCapture + '\n' : '') +
      (alerte ? '⚠️ ' + alerte + '\n' : '') +
      '\nVérifiez le SMS de réception (même montant, même TID), puis un clic suffit :\n' +
      '✅ Valider : ' + lienValidation_('paiement', 'valider', feuille.getLastRow(), cleLigne_(numero, sms, lienCapture)) + '\n' +
      '❌ Refuser : ' + lienValidation_('paiement', 'refuser', feuille.getLastRow(), cleLigne_(numero, sms, lienCapture)) + '\n' +
      '\n(Si ce n\'est pas du DEX, changez d\'abord le Service dans le tableau.)');

    return reponse_({ ok: true });
  } catch (erreur) {
    console.error(erreur);
    return reponse_({ ok: false, erreur: 'Envoi impossible : ' + String(erreur.message || erreur) });
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

// ---------- Mise en forme et tableau de bord ----------

const THEME = {
  marine: '#0F2A4A',   // bandeaux et en-têtes
  bleu: '#1E6FD9',     // DWTS / DEX
  orange: '#F46524',   // titres de section
  texte: '#334960',
  gris: '#576475',
  carte: '#F3F6FA',
  ligne: '#DCE3EC',
  police: 'Lato'
};

/** En-têtes marine, lignes alternées, statuts colorés, formats XAF sur les feuilles de données. */
function styliserFeuilles_(classeur, synthese) {
  const feuilles = [
    [FEUILLE_PAIEMENTS, ENTETES_PAIEMENTS.length], [FEUILLE_CLIENTS, ENTETES_CLIENTS.length],
    [FEUILLE_VERSEMENTS, ENTETES_VERSEMENTS.length], [FEUILLE_DEVIS, ENTETES_DEVIS.length],
    [FEUILLE_RETRAITS, ENTETES_RETRAITS.length]
  ];
  feuilles.forEach(function (f) {
    const feuille = classeur.getSheetByName(f[0]);
    if (!feuille) return;
    feuille.getBandings().forEach(function (b) { b.remove(); });
    const plage = feuille.getRange(1, 1, Math.max(feuille.getMaxRows(), 2), f[1]);
    plage.setFontFamily(THEME.police).setFontSize(10).setVerticalAlignment('middle');
    plage.applyRowBanding(SpreadsheetApp.BandingTheme.BLUE, true, false)
      .setHeaderRowColor(THEME.marine).setFirstRowColor('#FFFFFF').setSecondRowColor(THEME.carte);
    feuille.getRange(1, 1, 1, f[1]).setFontColor('#FFFFFF').setFontWeight('bold').setWrap(true);
    feuille.setRowHeight(1, 36);
    feuille.setTabColor(THEME.marine);
  });

  const paiements = classeur.getSheetByName(FEUILLE_PAIEMENTS);
  paiements.getRange('D:D').setNumberFormat('#,##0 "XAF"');
  paiements.getRange('J:J').setNumberFormat('#,##0 "XAF"');
  paiements.getRange('A:A').setNumberFormat('dd/MM/yyyy HH:mm');
  const statut = paiements.getRange(2, COL.STATUT, paiements.getMaxRows() - 1, 1);
  const regle = function (texte, fond, encre) {
    return SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(texte).setBackground(fond).setFontColor(encre).setBold(true).setRanges([statut]).build();
  };
  paiements.setConditionalFormatRules([
    regle('Validé', '#D9F2E3', '#1A7F37'), regle('À vérifier', '#FFF2CC', '#9A6700'), regle('Refusé', '#FDE2E1', '#C0392B')]);
  paiements.setTabColor(THEME.bleu);

  const devis = classeur.getSheetByName(FEUILLE_DEVIS);
  if (devis) devis.getRange('I:J').setNumberFormat('#,##0 "XAF"');
  const versements = classeur.getSheetByName(FEUILLE_VERSEMENTS);
  if (versements) versements.getRange('C:C').setNumberFormat('#,##0 "XAF"');

  const retraits = classeur.getSheetByName(FEUILLE_RETRAITS);
  if (retraits) {
    retraits.getRange('F:F').setNumberFormat('#,##0 "XAF"');
    retraits.getRange('A:A').setNumberFormat('dd/MM/yyyy HH:mm');
    retraits.getRange('H:H').setNumberFormat('dd/MM/yyyy HH:mm');
    const plage = retraits.getRange(2, RT.STATUT, retraits.getMaxRows() - 1, 1);
    const r = function (texte, fond, encre) {
      return SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(texte).setBackground(fond).setFontColor(encre).setBold(true).setRanges([plage]).build();
    };
    retraits.setConditionalFormatRules([r('Versé', '#D9F2E3', '#1A7F37'), r('Approuvé', '#FFF2CC', '#9A6700'),
      r('Annulé', '#EEEEEE', '#576475'), r('Refusé', '#FDE2E1', '#C0392B')]);
    retraits.setTabColor('#1A7F37');
  }

  synthese.setTabColor(THEME.orange);
}

/** Onglet « Tableau de bord » : indicateurs clés, évolution mensuelle, branches, statuts, top parrains et graphiques. */
function creerTableauDeBord_(classeur, sep) {
  const f = function (formule) { return sep === ';' ? formule : formule.replace(/;/g, ','); }; // formules écrites avec « ; »
  const nom = 'Tableau de bord';
  const tb = classeur.getSheetByName(nom) || classeur.insertSheet(nom, 0);
  tb.getCharts().forEach(function (g) { tb.removeChart(g); });
  tb.clear();
  tb.getRange(1, 1, tb.getMaxRows(), tb.getMaxColumns()).breakApart();
  tb.setHiddenGridlines(true);
  tb.setTabColor(THEME.orange);
  if (tb.getMaxColumns() < 16) tb.insertColumnsAfter(tb.getMaxColumns(), 16 - tb.getMaxColumns());
  if (tb.getMaxRows() < 80) tb.insertRowsAfter(tb.getMaxRows(), 80 - tb.getMaxRows());
  tb.getRange(1, 1, 80, 16).setFontFamily(THEME.police).setFontColor(THEME.gris).setVerticalAlignment('middle');
  tb.setColumnWidth(1, 24);
  tb.setColumnWidth(2, 190);
  tb.setColumnWidths(3, 12, 88);
  tb.setColumnWidths(15, 2, 100);

  const P = FEUILLE_PAIEMENTS, C = FEUILLE_CLIENTS, D = FEUILLE_DEVIS, DW = CONFIG.CODE_DWTS;
  const xaf = '#,##0 "XAF"';

  // Bandeau
  tb.getRange('A1:P2').setBackground(THEME.marine);
  tb.setRowHeight(1, 46);
  tb.getRange('B1').setValue('DWTS · Tableau de bord').setFontColor('#FFFFFF').setFontSize(18).setFontWeight('bold').setFontFamily('Raleway');
  tb.getRange('B2').setValue('Digital World Technology Service · données en direct (Paiements, Clients, Devis, Versements)').setFontColor('#B7C4D6').setFontSize(9);
  tb.getRange('O1').setFormula(f('="Mis à jour : "&TEXT(NOW();"dd/mm/yyyy hh:mm")')).setFontColor('#B7C4D6').setFontSize(9).setHorizontalAlignment('right');
  tb.getRange('O1:P1').merge();

  // Cartes d'indicateurs : [ligne, colonne, titre, formule, format, couleur]
  const debutMois = 'DATE(YEAR(TODAY());MONTH(TODAY());1)';
  const cartes = [
    [4, 3, 'CHIFFRE D\'AFFAIRES', '=SUMIFS(' + P + '!D:D;' + P + '!I:I;"Validé")', xaf, THEME.bleu],
    [4, 5, 'CA DU MOIS', '=SUMIFS(' + P + '!D:D;' + P + '!I:I;"Validé";' + P + '!A:A;">="&' + debutMois + ')', xaf, THEME.bleu],
    [4, 7, 'PAIEMENTS VALIDÉS', '=COUNTIF(' + P + '!I:I;"Validé")', '0', THEME.texte],
    [4, 9, 'PANIER MOYEN', '=IFERROR(C5/G5;0)', xaf, THEME.texte],
    [4, 11, 'À VÉRIFIER', '=COUNTIF(' + P + '!I:I;"À vérifier")', '0', '#9A6700'],
    [4, 13, 'DEVIS ENVOYÉS', '=COUNTA(' + D + '!B2:B)', '0', THEME.orange],
    [7, 3, 'CLIENTS INSCRITS', '=COUNTA(' + C + '!A2:A)', '0', THEME.texte],
    [7, 5, 'NOUVEAUX CE MOIS', '=COUNTIFS(' + C + '!D:D;">="&' + debutMois + ')', '0', THEME.texte],
    [7, 7, 'PARRAINS ACTIFS', '=IFERROR(COUNTUNIQUE(FILTER(' + C + '!C2:C;' + C + '!C2:C<>"";' + C + '!C2:C<>"' + DW + '"));0)', '0', THEME.texte],
    [7, 9, 'COMMISSIONS À VERSER', '=SUMIFS(' + P + '!J:J;' + P + '!I:I;"Validé";' + P + '!H:H;"<>' + DW + '")-SUM(' + FEUILLE_VERSEMENTS + '!C2:C)', xaf, '#C0392B'],
    [7, 11, 'COMMISSIONS DWTS', '=SUMIFS(' + P + '!J:J;' + P + '!I:I;"Validé";' + P + '!H:H;"' + DW + '")', xaf, '#1A7F37'],
    [7, 13, 'MONTANT DES DEVIS', '=SUM(' + D + '!I2:J)', xaf, THEME.orange]
  ];
  tb.getRange('B4').setValue('VENTES');
  tb.getRange('B7').setValue('CLIENTS & PARRAINAGE');
  tb.getRange('B4:B8').setFontColor(THEME.orange).setFontWeight('bold').setFontSize(10);
  cartes.forEach(function (c) {
    const titre = tb.getRange(c[0], c[1], 1, 2).merge();
    const valeur = tb.getRange(c[0] + 1, c[1], 1, 2).merge();
    titre.setValue(c[2]).setFontSize(8).setFontWeight('bold').setFontColor('#6C7687');
    valeur.setFormula(f(c[3])).setNumberFormat(c[4]).setFontSize(16).setFontWeight('bold').setFontColor(c[5]);
    tb.getRange(c[0], c[1], 2, 2).setBackground(THEME.carte).setHorizontalAlignment('center')
      .setBorder(true, true, true, true, null, null, THEME.ligne, SpreadsheetApp.BorderStyle.SOLID);
  });
  [4, 7].forEach(function (l) { tb.setRowHeight(l, 24); tb.setRowHeight(l + 1, 40); });

  // Évolution mensuelle (année en cours)
  const titreSection = function (cellule, texte) {
    tb.getRange(cellule).setValue(texte).setFontFamily('Raleway').setFontSize(18).setFontWeight('bold').setFontColor(THEME.orange);
  };
  titreSection('B10', 'Évolution mensuelle');
  const ligneMois = [];
  for (let m = 1; m <= 12; m++) ligneMois.push(f('=DATE(YEAR(TODAY());' + m + ';1)'));
  tb.getRange('C11:N11').setFormulas([ligneMois]).setNumberFormat('mmm yyyy');
  tb.getRange('O11').setValue('Total');
  tb.getRange('P11').setValue('Moyenne');
  tb.getRange('B11:P11').setFontWeight('bold').setFontColor(THEME.texte).setHorizontalAlignment('center')
    .setBorder(null, null, true, null, null, null, THEME.marine, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  const dans = function (feuille, col) {
    return feuille + '!$' + col + ':$' + col + ';">="&C$11;' + feuille + '!$' + col + ':$' + col + ';"<"&EDATE(C$11;1)';
  };
  const lignes = [
    ['Chiffre d\'affaires', '=SUMIFS(' + P + '!$D:$D;' + P + '!$I:$I;"Validé";' + dans(P, 'A') + ')', xaf, 'sum'],
    ['Paiements validés', '=COUNTIFS(' + P + '!$I:$I;"Validé";' + dans(P, 'A') + ')', '0', 'sum'],
    ['Panier moyen', '=IFERROR(C12/C13;0)', xaf, 'ratio'],
    ['Nouveaux clients', '=COUNTIFS(' + dans(C, 'D') + ')', '0', 'sum'],
    ['Devis envoyés', '=COUNTIFS(' + dans(D, 'A') + ')', '0', 'sum'],
    ['Montant des devis', '=SUMIFS(' + D + '!$I:$I;' + dans(D, 'A') + ')+SUMIFS(' + D + '!$J:$J;' + dans(D, 'A') + ')', xaf, 'sum'],
    ['Commissions parrains', '=SUMIFS(' + P + '!$J:$J;' + P + '!$I:$I;"Validé";' + P + '!$H:$H;"<>' + DW + '";' + dans(P, 'A') + ')', xaf, 'sum'],
    ['Commissions DWTS', '=SUMIFS(' + P + '!$J:$J;' + P + '!$I:$I;"Validé";' + P + '!$H:$H;"' + DW + '";' + dans(P, 'A') + ')', xaf, 'sum']
  ];
  lignes.forEach(function (l, i) {
    const r = 12 + i;
    tb.getRange(r, 2).setValue(l[0]).setFontWeight('bold').setFontColor(THEME.texte);
    const formules = [];
    for (let c = 0; c < 12; c++) {
      const col = String.fromCharCode(67 + c); // C..N
      formules.push(f(l[1].replace(/C\$11/g, col + '$11').replace(/C12\/C13/g, col + '12/' + col + '13')));
    }
    tb.getRange(r, 3, 1, 12).setFormulas([formules]).setNumberFormat(l[2]).setFontColor(THEME.gris);
    tb.getRange(r, 15).setFormula(l[3] === 'ratio' ? f('=IFERROR(O12/O13;0)') : '=SUM(C' + r + ':N' + r + ')');
    tb.getRange(r, 16).setFormula(l[3] === 'ratio' ? f('=IFERROR(O12/O13;0)') : f('=IFERROR(AVERAGE(C' + r + ':N' + r + ');0)'));
    tb.getRange(r, 15, 1, 2).setNumberFormat(l[2]).setFontWeight('bold').setFontColor('#6C7687');
    tb.getRange(r, 2, 1, 15).setBorder(null, null, true, null, null, null, THEME.ligne, SpreadsheetApp.BorderStyle.SOLID);
  });
  tb.getRange('C12:P19').setHorizontalAlignment('right');

  tb.insertChart(tb.newChart().setChartType(Charts.ChartType.COMBO)
    .addRange(tb.getRange('B11:N13')).setTransposeRowsAndColumns(true).setNumHeaders(1)
    .setOption('title', 'Chiffre d\'affaires et paiements par mois').setOption('legend', { position: 'top' })
    .setOption('colors', [THEME.bleu, THEME.orange])
    .setOption('seriesType', 'bars').setOption('series', { 1: { type: 'line', targetAxisIndex: 1, pointSize: 5 } })
    .setOption('vAxes', { 0: { title: 'XAF', minValue: 0 }, 1: { title: 'Paiements', minValue: 0 } })
    .setOption('fontName', THEME.police).setOption('width', 1250).setOption('height', 320)
    .setPosition(21, 2, 0, 0).build());

  // Par branche
  titreSection('B39', 'Par branche');
  tb.getRange('B40:E40').setValues([['Branche', 'Chiffre d\'affaires', 'Paiements', 'Part du CA']]);
  SERVICES.forEach(function (branche, i) {
    const r = 41 + i;
    tb.getRange(r, 2).setValue(branche).setFontWeight('bold').setFontColor(CONFIG.COULEURS[branche]);
    tb.getRange(r, 3).setFormula(f('=SUMIFS(' + P + '!D:D;' + P + '!I:I;"Validé";' + P + '!C:C;B' + r + ')')).setNumberFormat(xaf);
    tb.getRange(r, 4).setFormula(f('=COUNTIFS(' + P + '!I:I;"Validé";' + P + '!C:C;B' + r + ')'));
    tb.getRange(r, 5).setFormula(f('=IFERROR(C' + r + '/SUM(C$41:C$43);0)')).setNumberFormat('0%');
  });
  tb.getRange('B40:E40').setFontWeight('bold').setFontColor('#FFFFFF').setBackground(THEME.marine);
  tb.getRange('B41:E43').setBorder(null, null, true, null, null, true, THEME.ligne, SpreadsheetApp.BorderStyle.SOLID);

  // Statut des paiements
  titreSection('B46', 'Statut des paiements');
  tb.getRange('B47:C47').setValues([['Statut', 'Nombre']]).setFontWeight('bold').setFontColor('#FFFFFF').setBackground(THEME.marine);
  STATUTS.forEach(function (s, i) {
    tb.getRange(48 + i, 2).setValue(s).setFontWeight('bold');
    tb.getRange(48 + i, 3).setFormula(f('=COUNTIF(' + P + '!I:I;B' + (48 + i) + ')'));
  });

  // Top 5 parrains
  titreSection('B53', 'Top 5 parrains');
  tb.getRange('B54').setFormula(f('=IFERROR(QUERY(' + P + '!A2:N;"select H, count(J), sum(J) where I = \'Validé\' and H <> \'\' and H <> \'' + DW +
    '\' and J > 0 group by H order by sum(J) desc limit 5 label H \'Parrain\', count(J) \'Commandes\', sum(J) \'Gains (XAF)\'";0);"Aucun parrain actif pour l\'instant")'));
  tb.getRange('B54:D54').setFontWeight('bold').setFontColor('#FFFFFF').setBackground(THEME.marine);
  tb.getRange('D55:D59').setNumberFormat(xaf);

  // Graphiques circulaires
  tb.insertChart(tb.newChart().setChartType(Charts.ChartType.PIE).addRange(tb.getRange('B40:C43'))
    .setNumHeaders(1).setOption('title', 'Chiffre d\'affaires par branche').setOption('pieHole', 0.5)
    .setOption('colors', [CONFIG.COULEURS.DEX, CONFIG.COULEURS.Visuo, '#22B07D']).setOption('fontName', THEME.police)
    .setOption('width', 430).setOption('height', 260).setPosition(39, 7, 0, 0).build());
  tb.insertChart(tb.newChart().setChartType(Charts.ChartType.PIE).addRange(tb.getRange('B47:C50'))
    .setNumHeaders(1).setOption('title', 'Statut des paiements').setOption('pieHole', 0.5)
    .setOption('colors', ['#1A7F37', '#E3A008', '#C0392B']).setOption('fontName', THEME.police)
    .setOption('width', 430).setOption('height', 260).setPosition(39, 12, 10, 0).build());
  tb.insertChart(tb.newChart().setChartType(Charts.ChartType.LINE)
    .addRange(tb.getRange('B11:N11')).addRange(tb.getRange('B15:N16')).setTransposeRowsAndColumns(true).setNumHeaders(1)
    .setOption('title', 'Nouveaux clients et devis par mois').setOption('legend', { position: 'top' })
    .setOption('colors', ['#22B07D', THEME.orange]).setOption('pointSize', 5).setOption('fontName', THEME.police)
    .setOption('vAxis', { minValue: 0 }).setOption('width', 1000).setOption('height', 280).setPosition(53, 7, 0, 0).build());

  tb.setFrozenRows(2);
  classeur.setActiveSheet(tb);
  classeur.moveActiveSheet(1);
}

// ---------- Validation en un clic (liens des e-mails, page validation.html du site) ----------

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

/** Signature HMAC : action + numéro de ligne + empreinte. */
function signature_(action, ligne, cle) {
  const octets = Utilities.computeHmacSha256Signature(action + '|' + ligne + '|' + cle, secretLiens_());
  return octets.map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
}

/** Lien de l'e-mail : il ouvre la page validation.html du site (pas Google Drive). */
function lienValidation_(type, action, ligne, cle) {
  const nomSigne = type === 'retrait' ? 'retrait-' + action : action;
  return CONFIG.URL_SITE + 'validation.html?t=' + type + '&a=' + action + '&l=' + ligne + '&s=' + signature_(nomSigne, ligne, cle);
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

/** Ligne visée par un lien signé, ou null si le lien est faux ou la ligne a changé. */
function cibleValidation_(p) {
  const type = p.t === 'retrait' ? 'retrait' : 'paiement';
  const actions = type === 'retrait' ? ['verse', 'refuser'] : ['valider', 'refuser'];
  if (actions.indexOf(p.a) === -1) return null;
  const feuille = type === 'retrait' ? feuille_(FEUILLE_RETRAITS, ENTETES_RETRAITS) : feuille_(FEUILLE_PAIEMENTS, ENTETES_PAIEMENTS);
  const largeur = type === 'retrait' ? ENTETES_RETRAITS.length : ENTETES_PAIEMENTS.length;
  const ligne = Number(p.l);
  if (!ligne || ligne < 2 || ligne > feuille.getLastRow()) return null;
  const v = feuille.getRange(ligne, 1, 1, largeur).getValues()[0];
  const cle = type === 'retrait' ? cleRetrait_(v[RT.NUMERO - 1], v[RT.CODE - 1], v[RT.MONTANT - 1]) :
    cleLigne_(v[COL.WHATSAPP - 1], v[COL.SMS - 1], v[COL.CAPTURE - 1]);
  if (signature_(type === 'retrait' ? 'retrait-' + p.a : p.a, ligne, cle) !== String(p.s || '')) return null;
  return { type: type, action: p.a, feuille: feuille, ligne: ligne, v: v };
}

/** Résumé affiché par validation.html avant le bouton (rien n'est modifié ici). */
function infoValidation_(p) {
  const c = cibleValidation_(p);
  if (!c) return { ok: false, erreur: 'Ce lien n\'est pas valide ou la ligne a changé. Utilisez le tableau Google Sheets.' };
  const v = c.v;
  if (c.type === 'retrait') {
    return {
      ok: true, type: 'retrait', action: c.action, statut: v[RT.STATUT - 1], aTraiter: v[RT.STATUT - 1] === 'Approuvé',
      titre: c.action === 'verse' ? 'Confirmer le versement ?' : 'Refuser ce retrait ?',
      details: [['Retrait', v[RT.NUMERO - 1]], ['Parrain', v[RT.NOM - 1] + ' (' + v[RT.CODE - 1] + ')'],
        ['Mobile Money', String(v[RT.WHATSAPP - 1]).replace(/^'/, '')], ['Montant', formaterXaf_(v[RT.MONTANT - 1])]]
    };
  }
  return {
    ok: true, type: 'paiement', action: c.action, statut: v[COL.STATUT - 1], aTraiter: v[COL.STATUT - 1] === 'À vérifier',
    titre: c.action === 'valider' ? 'Valider ce paiement ?' : 'Refuser ce paiement ?',
    details: [['Montant', v[COL.MONTANT - 1] ? formaterXaf_(v[COL.MONTANT - 1]) : '? (capture : à lire)'], ['Service', v[COL.SERVICE - 1]],
      ['Client', String(v[COL.WHATSAPP - 1]).replace(/^'/, '')], ['TID', v[COL.TID - 1] || '—'], ['Parrain', v[COL.PARRAIN - 1] || '—'],
      ['SMS collé', v[COL.SMS - 1] || '—']],
    capture: v[COL.CAPTURE - 1] || ''
  };
}

/** Bouton de validation.html : applique le statut (une seule fois). */
function confirmerValidation_(p) {
  const verrou = LockService.getScriptLock();
  verrou.waitLock(15000);
  try {
    const c = cibleValidation_(p);
    if (!c) return { ok: false, erreur: 'Lien invalide.' };
    if (c.type === 'retrait') {
      if (c.v[RT.STATUT - 1] !== 'Approuvé') return { ok: false, erreur: 'Déjà traité (statut : ' + c.v[RT.STATUT - 1] + ').' };
      const statut = c.action === 'verse' ? 'Versé' : 'Refusé';
      c.feuille.getRange(c.ligne, RT.STATUT, 1, 3).setValues([[statut, new Date(), statut === 'Versé' ? 'Versé par Mobile Money' : 'Refusé par DWTS']]);
      if (statut === 'Versé') {
        // Le versement entre dans la feuille Versements : le solde du parrain se met à jour
        feuille_(FEUILLE_VERSEMENTS, ENTETES_VERSEMENTS).appendRow([c.v[RT.CODE - 1], new Date(), Number(c.v[RT.MONTANT - 1]) || 0, 'Retrait ' + c.v[RT.NUMERO - 1]]);
      }
      return { ok: true, message: statut === 'Versé' ? 'Versement enregistré ✓ Le solde du parrain est à jour.' : 'Retrait refusé ✓ Le montant redevient disponible.' };
    }
    if (c.v[COL.STATUT - 1] !== 'À vérifier') return { ok: false, erreur: 'Déjà traité (statut : ' + c.v[COL.STATUT - 1] + ').' };
    const statut = c.action === 'valider' ? 'Validé' : 'Refusé';
    c.feuille.getRange(c.ligne, COL.STATUT).setValue(statut);
    if (statut === 'Refusé') return { ok: true, message: 'Paiement refusé ✓' };
    traiterLigne_(c.feuille, c.ligne, true);
    return { ok: true, message: emailDuClient_(c.v[COL.WHATSAPP - 1]) ?
      'Paiement validé ✓ La facture PDF a été envoyée par e-mail au client et apparaît dans son espace.' :
      'Paiement validé ✓ Ce client n\'a pas d\'e-mail : la facture PDF vous est envoyée, à transférer sur WhatsApp.' };
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
  // Fichier privé : le client reçoit le PDF en pièce jointe et le télécharge depuis Mon espace (sans lien Drive)
  const emailClient = emailDuClient_(telephone);
  if (emailClient) {
    // Facture envoyée directement au client (adresse donnée à l'inscription)
    MailApp.sendEmail(emailClient, 'DWTS : votre facture ' + numero + ' (' + montantTexte + ')',
      'Bonjour' + (client ? ' ' + client : '') + ',\n\nMerci pour votre paiement. Votre facture ' + numero + ' (' + montantTexte + ') est jointe à ce message.\n' +
      'Vous la retrouvez aussi dans votre espace client : ' + CONFIG.URL_SITE + 'espace.html\n\nDWTS - Digital World Technology Service',
      { attachments: [pdf], name: 'DWTS', replyTo: CONFIG.EMAIL_ALERTE });
  } else {
    // Client sans adresse e-mail connue : la facture vous revient, à transférer sur WhatsApp
    MailApp.sendEmail(CONFIG.EMAIL_ALERTE, 'DWTS : facture ' + numero + ' (' + montantTexte + ') : pas d\'e-mail client',
      'Ce client n\'a pas d\'adresse e-mail enregistrée. Transférez le PDF joint sur WhatsApp (' + telephone + ').',
      { attachments: [pdf] });
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
  const entreprise = String(d.entreprise || '').trim().slice(0, 80);
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
    '<table style="width:100%;margin-top:14px"><tr><td><div style="color:' + couleur + ';font-weight:bold;font-size:10px">PRÉPARÉ POUR</div>' + (entreprise ? '<b style="font-size:14px">' + echapperHtml_(entreprise) + '</b><br>' + echapperHtml_(nom) : '<b>' + echapperHtml_(nom) + '</b>') + '<br>' +
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

  const resume = lignes.map(function (l) { return l.quantite + ' × ' + l.prestation + ' (' + l.formule + ')'; }).join(' ; ');
  feuille_(FEUILLE_DEVIS, ENTETES_DEVIS).appendRow([
    maintenant, reference, branche, "'" + numero, nom, entreprise, email, resume, unique, mensuel, precisions, fichier.getUrl()]);

  MailApp.sendEmail(email, 'DWTS : votre devis ' + reference + ' (' + formaterXaf_(unique + mensuel) + ')',
    'Bonjour ' + nom + ',\n\nMerci pour votre demande. Votre devis ' + reference + ' est joint à ce message (valable 15 jours, jusqu\'au ' + validite + ').\n' +
    'Pour le valider ou le modifier, répondez à cet e-mail ou écrivez-nous sur WhatsApp au 062 67 14 45.\n\nDWTS - Digital World Technology Service',
    { attachments: [pdf], name: 'DWTS', replyTo: CONFIG.EMAIL_ALERTE });
  // Pas d'alerte pour vous : le devis est dans la feuille Devis (lien du PDF en colonne L)
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
