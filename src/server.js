// Serveur du site DWTS : site vitrine (dossier public/) + espace client DEX.
const fs = require('fs');
const path = require('path');
const express = require('express');
const config = require('./config');
const sheets = require('./sheets');
const securite = require('./securite');
const utilisateurs = require('./utilisateurs');
const vues = require('./vues');

const DOSSIER_PUBLIC = path.join(__dirname, '..', 'public');
const MARQUEUR_MENU = '<!--menu-compte-->';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1); // Railway passe par un proxy HTTPS

// Vérifie que le serveur répond (utilisé par Railway).
app.get('/health', (req, res) => res.json({ ok: true }));

app.use(securite.entetes);

// Pulses Chariow : avant les sessions et formulaires (besoin du corps brut, pas de CSRF).
app.use(require('./routes/webhook'));

app.use(securite.session);
app.use(express.urlencoded({ extended: false, limit: '20kb' }));
app.use(securite.csrf);

// Retrouve le client connecté (s'il y en a un).
app.use(async (req, res, next) => {
  res.locals.utilisateur = null;
  if (req.session.uid && sheets.estConfigure()) {
    try {
      res.locals.utilisateur = await utilisateurs.trouverParId(req.session.uid);
      if (!res.locals.utilisateur) req.session.uid = null;
    } catch (err) {
      console.error('Lecture du compte impossible :', err.message);
    }
  }
  next();
});

app.use(require('./routes/compte'));
app.use(require('./routes/commandes'));
app.use(require('./routes/parrainage'));

// Pages du site vitrine : on ajoute dans le menu Connexion / Inscription ou Mon compte.
const pagesHtml = new Map();
for (const f of fs.readdirSync(DOSSIER_PUBLIC).filter((n) => n.endsWith('.html'))) {
  pagesHtml.set('/' + f, fs.readFileSync(path.join(DOSSIER_PUBLIC, f), 'utf8'));
}
app.get(['/', '/:page.html'], (req, res, next) => {
  const html = pagesHtml.get(req.path === '/' ? '/index.html' : req.path);
  if (!html) return next();
  res.type('html').send(html.replace(MARQUEUR_MENU, vues.menuCompte(res.locals.utilisateur)));
});

// Fichiers du site vitrine : seul le dossier public/ est servi, jamais la racine du dépôt.
app.use(express.static(DOSSIER_PUBLIC, { dotfiles: 'deny', index: false }));

app.use((req, res) => res.status(404).send(vues.pageMessage(req, res, {
  titre: 'Page introuvable',
  texte: "Cette page n'existe pas ou a été déplacée.",
})));

async function demarrer() {
  if (sheets.estConfigure()) {
    try {
      const crees = await sheets.preparerOnglets();
      console.log(crees.length ? `Onglets créés : ${crees.join(', ')}` : 'Google Sheet prêt.');
      // Toutes les 5 minutes : commissions des commandes passées à "paye" à la main dans le Sheet.
      const commissions = require('./commissions');
      setInterval(() => commissions.crediterManquantes().catch((err) => console.error('Commissions :', err.message)), 5 * 60 * 1000).unref();
    } catch (e) {
      console.error('Connexion au Google Sheet impossible :', e.message);
    }
  } else {
    console.warn('Attention : Google Sheets non configuré (voir .env.example).');
  }
  app.listen(config.port, () => console.log(`Site prêt sur le port ${config.port}`));
}

if (require.main === module) demarrer();

module.exports = app;
