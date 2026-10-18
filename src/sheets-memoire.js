// Faux Google Sheet en mémoire, pour tester le site sur un ordinateur sans compte Google.
// Activé seulement avec SHEETS_MEMOIRE=1, et jamais en production. Tout est perdu à l'arrêt.
const store = { Feuille1: [] };

const decouper = (range) => {
  const [onglet, cellules] = range.split('!');
  return { onglet: onglet.replace(/^'|'$/g, ''), cellules };
};
const indexColonne = (lettres) => [...lettres].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0) - 1;

module.exports = {
  store,
  spreadsheets: {
    get: async () => ({ data: { sheets: Object.keys(store).map((title) => ({ properties: { title } })) } }),
    batchUpdate: async ({ requestBody }) => {
      requestBody.requests.forEach((r) => { store[r.addSheet.properties.title] = []; });
    },
    values: {
      get: async ({ range }) => {
        const { onglet, cellules } = decouper(range);
        const lignes = store[onglet] || [];
        return { data: { values: cellules === '1:1' ? lignes.slice(0, 1) : lignes.map((l) => [...l]) } };
      },
      update: async ({ range, requestBody }) => { store[decouper(range).onglet][0] = requestBody.values[0]; },
      append: async ({ range, requestBody }) => { store[decouper(range).onglet].push(...requestBody.values.map((l) => [...l])); },
      batchUpdate: async ({ requestBody }) => {
        requestBody.data.forEach(({ range, values }) => {
          const { onglet, cellules } = decouper(range);
          const m = cellules.match(/([A-Z]+)(\d+)/);
          const ligne = store[onglet][m[2] - 1];
          ligne[indexColonne(m[1])] = values[0][0];
        });
      },
    },
  },
};
