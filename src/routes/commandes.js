// Pages « Mes commandes », détail avec simulateur, écran « Payer » et envoi vers Chariow.
const express = require('express');
const config = require('../config');
const commandes = require('../commandes');
const vues = require('../vues');
const vuesCommandes = require('../vues-commandes');
const { exigerConnexion } = require('../securite');

const routeur = express.Router();
routeur.use(['/mes-commandes', '/commandes'], exigerConnexion);

const NUMERO_VALIDE = /^[\w.-]{1,40}$/;

const introuvable = (req, res) => res.status(404).send(vues.pageMessage(req, res, {
  titre: 'Commande introuvable',
  texte: "Cette commande n'existe pas ou n'est pas liée à votre adresse e-mail. Si vous pensez que c'est une erreur, écrivez-nous sur WhatsApp.",
  lien: '/mes-commandes',
  libelleLien: 'Voir mes commandes',
}));

const indisponible = (req, res, err) => {
  console.error(err);
  res.status(503).send(vues.pageMessage(req, res, {
    titre: 'Service momentanément indisponible',
    texte: 'Nous ne pouvons pas afficher vos commandes pour le moment. Réessayez dans quelques minutes.',
  }));
};

// Charge la commande du client connecté (ou affiche « introuvable »).
async function chargerCommande(req, res, next) {
  if (!NUMERO_VALIDE.test(req.params.numero)) return introuvable(req, res);
  try {
    const c = await commandes.trouverPour(res.locals.utilisateur.email, req.params.numero);
    if (!c) return introuvable(req, res);
    res.locals.commande = c;
    return next();
  } catch (err) {
    return indisponible(req, res, err);
  }
}

routeur.get('/mes-commandes', async (req, res) => {
  try {
    const liste = await commandes.listerPour(res.locals.utilisateur.email);
    res.send(vuesCommandes.pageMesCommandes(req, res, { liste }));
  } catch (err) {
    indisponible(req, res, err);
  }
});

routeur.get('/commandes/:numero', chargerCommande, (req, res) => {
  const c = res.locals.commande;
  // On pré-remplit avec le dernier choix enregistré.
  const choix = {
    impression: String(c.impression).toLowerCase() === 'oui',
    couleur: commandes.lireMontant(c.pages_couleur),
    noirBlanc: commandes.lireMontant(c.pages_noir_blanc),
  };
  res.send(vuesCommandes.pageCommande(req, res, { commande: c, choix }));
});

// Écran « Payer » : affiche le montant exact. Rien n'est enregistré à ce stade.
routeur.get('/commandes/:numero/payer', chargerCommande, (req, res) => {
  const c = res.locals.commande;
  if (!commandes.peutPayer(c)) return res.redirect('/commandes/' + encodeURIComponent(c.numero_commande));
  const { erreur, choix } = commandes.lireChoix(req.query);
  if (erreur) {
    const brut = { impression: true, couleur: req.query.couleur, noirBlanc: req.query.noir_blanc };
    return res.status(400).send(vuesCommandes.pageCommande(req, res, { commande: c, choix: brut, erreur }));
  }
  res.send(vuesCommandes.pagePayer(req, res, { commande: c, choix, detail: commandes.calculer(c, choix) }));
});

// Bouton « Payer sur Chariow » : on enregistre montant_attendu + statut, puis on envoie vers Chariow.
routeur.post('/commandes/:numero/payer', chargerCommande, async (req, res) => {
  const c = res.locals.commande;
  if (!config.chariowProductUrl) {
    return res.status(503).send(vues.pageMessage(req, res, {
      titre: 'Paiement indisponible',
      texte: 'Le paiement en ligne n\'est pas encore activé. Écrivez-nous sur WhatsApp pour régler votre commande.',
    }));
  }
  const { erreur, choix } = commandes.lireChoix(req.body);
  if (erreur) return res.redirect('/commandes/' + encodeURIComponent(c.numero_commande));
  try {
    const r = await commandes.enregistrerChoix(res.locals.utilisateur.email, c.numero_commande, choix);
    if (r.erreur) return res.redirect('/commandes/' + encodeURIComponent(c.numero_commande));
    return res.redirect(303, config.chariowProductUrl);
  } catch (err) {
    return indisponible(req, res, err);
  }
});

module.exports = routeur;
