// Pages de l'espace client, rendues côté serveur avec le design du site (thème « papier » de DEX).
const config = require('./config');

const VERSION = '202610181716'; // même numéro que les pages du site (cache des navigateurs)

// Protège tout texte affiché (empêche l'injection de code HTML).
function e(v) {
  return String(v === null || v === undefined ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const xaf = (n) => Math.round(Number(n) || 0).toLocaleString('fr-FR').replace(/ | /g, ' ') + ' XAF';

const lienWhatsapp = (texte) => `https://wa.me/${config.whatsappNumber}?text=${encodeURIComponent(texte)}`;

// Liens Connexion / Inscription / Mon compte ajoutés dans le menu du site.
function menuCompte(utilisateur, actif) {
  const courant = (nom) => (actif === nom ? ' aria-current="page"' : '');
  if (utilisateur) return `<a href="/mon-compte"${courant('compte')}>Mon compte</a>`;
  return `<a href="/connexion"${courant('connexion')}>Connexion</a>\n      <a href="/inscription"${courant('inscription')}>Inscription</a>`;
}

function mise(req, res, { titre, contenu, actif, onglet }) {
  const u = res.locals.utilisateur;
  const ongletCourant = (nom) => (onglet === nom ? ' aria-current="page"' : '');
  const onglets = u && onglet ? `
      <nav class="onglets-espace" aria-label="Espace client">
        <a href="/mes-commandes"${ongletCourant('commandes')}>Mes commandes</a>
        <a href="/mon-compte"${ongletCourant('compte')}>Mon compte</a>
      </nav>` : '';
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${e(titre)} | DEX — DWTS</title>
  <meta name="robots" content="noindex">
  <meta name="theme-color" content="#f4f1ea">
  <link rel="icon" type="image/png" href="/assets/img/logo-dwts.png?v=${VERSION}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400..900&amp;display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/assets/css/style.css?v=${VERSION}">
  <link rel="stylesheet" href="/assets/css/espace.css?v=${VERSION}">
</head>
<body class="page-dex theme-papier espace">
  <a class="lien-evitement" href="#contenu">Aller au contenu</a>
  <header class="nav est-defilee">
    <div class="conteneur nav__inner">
      <a class="marque" href="/index.html" aria-label="DWTS, retour à l'accueil">
        <span class="marque__sigle">DWTS</span>
        <span class="marque__nom" aria-hidden="true">Digital World<br>Technology <b>Service</b></span>
      </a>
      <button class="nav__burger" type="button" aria-expanded="false" aria-controls="menu" aria-label="Ouvrir le menu">
        <span></span><span></span>
      </button>
      <nav id="menu" class="nav__liens" aria-label="Navigation principale">
      <a href="/index.html">DWTS</a>
      <a href="/dex.html">DEX</a>
      <a href="/visuo.html">Visuo</a>
      <a href="/logia.html">Logia</a>
      <a href="/tarifs.html">Tarifs</a>
      <a href="/parrainage.html">Parrainage</a>
      ${menuCompte(u, actif)}
        <a class="bouton bouton--petit" href="${e(lienWhatsapp('Bonjour DWTS, je souhaite commander un document (DEX).'))}" target="_blank" rel="noopener">Commander<span class="sr-only"> sur WhatsApp (nouvel onglet)</span></a>
      </nav>
    </div>
  </header>

  <main id="contenu" class="espace__main">
    <div class="conteneur espace__conteneur">${onglets}
${contenu}
    </div>
  </main>

  <footer class="espace__pied">
    <div class="conteneur">
      <span>© 2026 DWTS — Digital World Technology Service. Port-Gentil, Gabon.</span>
      <a href="${e(lienWhatsapp('Bonjour DWTS, j\'ai une question sur mon espace client DEX.'))}" target="_blank" rel="noopener">Aide sur WhatsApp</a>
    </div>
  </footer>

  <script src="/assets/js/main.js?v=${VERSION}"></script>
  <script src="/assets/js/espace.js?v=${VERSION}"></script>
</body>
</html>`;
}

// Champ de formulaire avec son message d'erreur.
function champ({ nom, libelle, type = 'text', valeur = '', erreur, aide, attributs = '' }) {
  const idAide = aide ? ` aria-describedby="aide-${nom}"` : '';
  return `
      <div class="champ${erreur ? ' champ--erreur' : ''}">
        <label for="${nom}">${libelle}</label>
        <input id="${nom}" name="${nom}" type="${type}" value="${e(valeur)}"${idAide}${erreur ? ' aria-invalid="true"' : ''} ${attributs}>
        ${aide ? `<p class="champ__aide" id="aide-${nom}">${aide}</p>` : ''}
        ${erreur ? `<p class="champ__erreur" role="alert">${e(erreur)}</p>` : ''}
      </div>`;
}

const jeton = (res) => `<input type="hidden" name="_csrf" value="${e(res.locals.csrf)}">`;

function pageInscription(req, res, { valeurs = {}, erreurs = {} } = {}) {
  const general = erreurs.general ? `<p class="alerte alerte--erreur" role="alert">${e(erreurs.general)}</p>` : '';
  return mise(req, res, {
    titre: 'Inscription',
    actif: 'inscription',
    contenu: `
      <section class="carte-espace carte-espace--etroite">
        <p class="surtitre">Espace client DEX</p>
        <h1 class="espace__titre">Créer mon compte</h1>
        <p class="espace__intro">Suivez vos commandes, payez en ligne et gagnez de l'argent en parrainant vos proches.</p>
        ${general}
        <form method="post" action="/inscription" novalidate>
          ${jeton(res)}
          ${champ({ nom: 'nom', libelle: 'Nom complet', valeur: valeurs.nom, erreur: erreurs.nom, attributs: 'autocomplete="name" required maxlength="80"' })}
          ${champ({ nom: 'whatsapp', libelle: 'Numéro WhatsApp', type: 'tel', valeur: valeurs.whatsapp, erreur: erreurs.whatsapp, aide: 'Exemple : 062 67 14 45', attributs: 'autocomplete="tel" inputmode="tel" required' })}
          ${champ({ nom: 'email', libelle: 'Adresse e-mail', type: 'email', valeur: valeurs.email, erreur: erreurs.email, aide: 'Utilisez la même adresse quand vous payez sur Chariow.', attributs: 'autocomplete="email" inputmode="email" required' })}
          ${champ({ nom: 'mot_de_passe', libelle: 'Mot de passe', type: 'password', erreur: erreurs.mot_de_passe, aide: '8 caractères au moins.', attributs: 'autocomplete="new-password" required minlength="8"' })}
          ${champ({ nom: 'code_parrain', libelle: 'Code parrain (facultatif)', valeur: valeurs.code_parrain, erreur: erreurs.code_parrain, aide: 'Attention : il ne pourra plus être modifié après l\'inscription.', attributs: 'autocomplete="off" autocapitalize="characters" maxlength="6"' })}
          <button class="bouton bouton--plein" type="submit">Créer mon compte</button>
        </form>
        <p class="espace__bas">Déjà inscrit ? <a href="/connexion">Se connecter</a></p>
      </section>`,
  });
}

function pageConnexion(req, res, { valeurs = {}, erreur, suite = '' } = {}) {
  return mise(req, res, {
    titre: 'Connexion',
    actif: 'connexion',
    contenu: `
      <section class="carte-espace carte-espace--etroite">
        <p class="surtitre">Espace client DEX</p>
        <h1 class="espace__titre">Se connecter</h1>
        ${erreur ? `<p class="alerte alerte--erreur" role="alert">${e(erreur)}</p>` : ''}
        <form method="post" action="/connexion" novalidate>
          ${jeton(res)}
          <input type="hidden" name="suite" value="${e(suite)}">
          ${champ({ nom: 'email', libelle: 'Adresse e-mail', type: 'email', valeur: valeurs.email, attributs: 'autocomplete="email" inputmode="email" required' })}
          ${champ({ nom: 'mot_de_passe', libelle: 'Mot de passe', type: 'password', attributs: 'autocomplete="current-password" required' })}
          <button class="bouton bouton--plein" type="submit">Se connecter</button>
        </form>
        <p class="espace__bas">Pas encore de compte ? <a href="/inscription">Créer un compte</a></p>
        <p class="espace__bas">Mot de passe oublié ? <a href="${e(lienWhatsapp('Bonjour DWTS, j\'ai oublié le mot de passe de mon espace client DEX.'))}" target="_blank" rel="noopener">Écrivez-nous sur WhatsApp</a></p>
      </section>`,
  });
}

function pageMonCompte(req, res, { parrain } = {}) {
  const u = res.locals.utilisateur;
  const lienPartage = `${config.siteUrl}/inscription?parrain=${encodeURIComponent(u.code_parrain)}`;
  const messagePartage = `Je te recommande DEX (DWTS) pour tes CV, exposés, rapports et mémoires. Inscris-toi avec mon code parrain ${u.code_parrain} : ${lienPartage}`;
  return mise(req, res, {
    titre: 'Mon compte',
    actif: 'compte',
    onglet: 'compte',
    contenu: `
      <section class="carte-espace">
        <p class="surtitre">Espace client DEX</p>
        <h1 class="espace__titre">Bonjour ${e(String(u.nom).split(' ')[0])}</h1>
        <dl class="infos">
          <div><dt>Nom</dt><dd>${e(u.nom)}</dd></div>
          <div><dt>WhatsApp</dt><dd>${e(require('./utilisateurs').formaterWhatsapp(u.whatsapp))}</dd></div>
          <div><dt>E-mail</dt><dd>${e(u.email)}</dd></div>
          ${parrain ? `<div><dt>Parrainé par</dt><dd>${e(parrain)}</dd></div>` : ''}
        </dl>
      </section>

      <section class="carte-espace">
        <h2 class="espace__sous-titre">Mon code parrain</h2>
        <p class="code-parrain" aria-label="Votre code parrain">${e(u.code_parrain)}</p>
        <div class="actions">
          <button class="bouton bouton--contour bouton--petit" type="button" data-copier="${e(u.code_parrain)}">Copier le code</button>
        </div>
        <p class="espace__intro">Partagez ce lien : la personne qui s'inscrit avec devient votre filleul.</p>
        <p class="lien-partage">${e(lienPartage)}</p>
        <div class="actions">
          <button class="bouton bouton--contour bouton--petit" type="button" data-copier="${e(lienPartage)}">Copier le lien</button>
          <a class="bouton bouton--petit" href="https://wa.me/?text=${e(encodeURIComponent(messagePartage))}" target="_blank" rel="noopener">Partager sur WhatsApp</a>
        </div>
      </section>

      <form method="post" action="/deconnexion" class="deconnexion">
        ${jeton(res)}
        <button class="bouton bouton--contour bouton--petit" type="submit">Se déconnecter</button>
      </form>`,
  });
}

function pageMessage(req, res, { titre, texte, lien = '/', libelleLien = "Retour à l'accueil" }) {
  return mise(req, res, {
    titre,
    contenu: `
      <section class="carte-espace carte-espace--etroite">
        <h1 class="espace__titre">${e(titre)}</h1>
        <p class="espace__intro">${e(texte)}</p>
        <a class="bouton bouton--plein" href="${e(lien)}">${e(libelleLien)}</a>
      </section>`,
  });
}

module.exports = { e, xaf, menuCompte, mise, champ, jeton, pageInscription, pageConnexion, pageMonCompte, pageMessage, lienWhatsapp };
