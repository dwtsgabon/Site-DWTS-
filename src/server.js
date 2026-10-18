// Serveur du site DWTS : site vitrine (dossier public/) + espace client DEX.
const path = require('path');
const express = require('express');
const config = require('./config');
const sheets = require('./sheets');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1); // Railway passe par un proxy HTTPS

// Vérifie que le serveur répond (utilisé par Railway).
app.get('/health', (req, res) => res.json({ ok: true }));

// Site vitrine : seul le dossier public/ est servi, jamais la racine du dépôt.
app.use(express.static(path.join(__dirname, '..', 'public'), { dotfiles: 'deny', index: 'index.html' }));

app.use((req, res) => res.status(404).send('Page introuvable.'));

async function demarrer() {
  if (sheets.estConfigure()) {
    try {
      const crees = await sheets.preparerOnglets();
      console.log(crees.length ? `Onglets créés : ${crees.join(', ')}` : 'Google Sheet prêt.');
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
