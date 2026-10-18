// Inscription, connexion, déconnexion et page « Mon compte ».
const express = require('express');
const utilisateurs = require('../utilisateurs');
const vues = require('../vues');
const { nouveauJeton, limiteTentatives, exigerConnexion } = require('../securite');

const routeur = express.Router();

// N'accepte qu'un chemin interne au site après connexion (évite les redirections piégées).
const suiteSure = (s) => (typeof s === 'string' && /^\/(?!\/)[^\\\s]*$/.test(s) ? s : '/mes-commandes');

const indisponible = (req, res, err) => {
  console.error(err);
  res.status(503).send(vues.pageMessage(req, res, {
    titre: 'Service momentanément indisponible',
    texte: 'Nous ne pouvons pas traiter votre demande pour le moment. Réessayez dans quelques minutes.',
  }));
};

routeur.get('/inscription', (req, res) => {
  if (res.locals.utilisateur) return res.redirect('/mon-compte');
  const code = utilisateurs.normaliserCode(req.query.parrain).slice(0, 6);
  res.send(vues.pageInscription(req, res, { valeurs: { code_parrain: code } }));
});

routeur.post('/inscription', limiteTentatives(10), async (req, res) => {
  if (res.locals.utilisateur) return res.redirect('/mon-compte');
  const valeurs = { nom: req.body.nom, whatsapp: req.body.whatsapp, email: req.body.email, code_parrain: req.body.code_parrain };
  const { erreurs, donnees } = utilisateurs.validerInscription(req.body);
  if (Object.keys(erreurs).length) return res.status(400).send(vues.pageInscription(req, res, { valeurs, erreurs }));
  try {
    const resultat = await utilisateurs.creer(donnees);
    if (resultat.erreurs) return res.status(400).send(vues.pageInscription(req, res, { valeurs, erreurs: resultat.erreurs }));
    req.session.uid = resultat.utilisateur.id;
    nouveauJeton(req);
    return res.redirect('/mes-commandes');
  } catch (err) {
    return indisponible(req, res, err);
  }
});

routeur.get('/connexion', (req, res) => {
  if (res.locals.utilisateur) return res.redirect(suiteSure(req.query.suite));
  res.send(vues.pageConnexion(req, res, { suite: suiteSure(req.query.suite) }));
});

routeur.post('/connexion', limiteTentatives(10), async (req, res) => {
  const suite = suiteSure(req.body.suite);
  try {
    const u = await utilisateurs.verifierConnexion(req.body.email, req.body.mot_de_passe);
    if (!u) {
      return res.status(401).send(vues.pageConnexion(req, res, {
        valeurs: { email: req.body.email }, suite, erreur: 'E-mail ou mot de passe incorrect.',
      }));
    }
    req.session.uid = u.id;
    nouveauJeton(req);
    return res.redirect(suite);
  } catch (err) {
    return indisponible(req, res, err);
  }
});

routeur.post('/deconnexion', (req, res) => {
  req.session = null;
  res.redirect('/');
});

routeur.get('/mon-compte', exigerConnexion, async (req, res) => {
  const u = res.locals.utilisateur;
  let parrain = '';
  if (u.parrain_code) {
    const p = await utilisateurs.trouverParCode(u.parrain_code).catch(() => null);
    parrain = p ? `${p.nom} (${u.parrain_code})` : u.parrain_code;
  }
  res.send(vues.pageMonCompte(req, res, { parrain }));
});

module.exports = routeur;
