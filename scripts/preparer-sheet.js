// Crée les onglets du Google Sheet et leurs en-têtes : npm run preparer-sheet
const sheets = require('../src/sheets');
sheets.preparerOnglets()
  .then((crees) => console.log(crees.length ? 'Onglets créés : ' + crees.join(', ') : 'Tous les onglets existent déjà.'))
  .catch((e) => { console.error('Erreur :', e.message); process.exit(1); });
