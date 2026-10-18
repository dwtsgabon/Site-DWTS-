// Tableau de bord parrainage : GET /mon-parrainage
const express = require('express');
const commissions = require('../commissions');
const vues = require('../vues');
const { pageParrainage } = require('../vues-parrainage');
const { exigerConnexion } = require('../securite');

const routeur = express.Router();

routeur.get('/mon-parrainage', exigerConnexion, async (req, res) => {
  try {
    // Prend en compte les commandes que tu as passées à "paye" à la main dans le Sheet.
    await commissions.crediterSiBesoin().catch((err) => console.error('Commissions :', err.message));
    const tdb = await commissions.tableauDeBord(res.locals.utilisateur);
    res.send(pageParrainage(req, res, { tdb }));
  } catch (err) {
    console.error(err);
    res.status(503).send(vues.pageMessage(req, res, {
      titre: 'Service momentanément indisponible',
      texte: 'Nous ne pouvons pas afficher votre parrainage pour le moment. Réessayez dans quelques minutes.',
    }));
  }
});

module.exports = routeur;
