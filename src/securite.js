// Sessions, protection CSRF, limite de tentatives et en-têtes de sécurité.
const crypto = require('crypto');
const cookieSession = require('cookie-session');
const { rateLimit } = require('express-rate-limit');
const config = require('./config');

function secretSession() {
  if (config.sessionSecret.length >= 32) return config.sessionSecret;
  if (config.production) throw new Error('SESSION_SECRET manquant ou trop court (32 caractères minimum).');
  console.warn('Attention : SESSION_SECRET absent, secret temporaire utilisé (sessions perdues au redémarrage).');
  return crypto.randomBytes(32).toString('hex');
}

// Session signée dans un cookie (survit aux redémarrages du serveur).
const session = cookieSession({
  name: 'dex_session',
  keys: [secretSession()],
  httpOnly: true,
  sameSite: 'lax',
  secure: config.production,
  maxAge: 7 * 24 * 60 * 60 * 1000,
});

function entetes(req, res, next) {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  });
  if (config.production) res.set('Strict-Transport-Security', 'max-age=31536000');
  next();
}

// Donne un jeton CSRF à chaque visiteur et le vérifie sur chaque formulaire envoyé.
function csrf(req, res, next) {
  if (!req.session.csrf) req.session.csrf = crypto.randomBytes(24).toString('hex');
  res.locals.csrf = req.session.csrf;
  if (req.method !== 'POST') return next();
  const recu = Buffer.from(String((req.body && req.body._csrf) || ''));
  const attendu = Buffer.from(req.session.csrf);
  if (recu.length === attendu.length && crypto.timingSafeEqual(recu, attendu)) return next();
  return res.status(403).send(require('./vues').pageMessage(req, res, {
    titre: 'Formulaire expiré',
    texte: 'Pour votre sécurité, ce formulaire a expiré. Revenez en arrière, actualisez la page et réessayez.',
  }));
}

// Change le jeton CSRF à la connexion / déconnexion.
function nouveauJeton(req) {
  req.session.csrf = crypto.randomBytes(24).toString('hex');
}

function limiteTentatives(max) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res) => res.status(429).send(require('./vues').pageMessage(req, res, {
      titre: 'Trop de tentatives',
      texte: 'Vous avez fait trop de tentatives. Patientez 15 minutes avant de réessayer.',
    })),
  });
}

// Bloque l'accès aux pages réservées aux clients connectés.
function exigerConnexion(req, res, next) {
  if (res.locals.utilisateur) return next();
  return res.redirect('/connexion?suite=' + encodeURIComponent(req.originalUrl));
}

module.exports = { session, entetes, csrf, nouveauJeton, limiteTentatives, exigerConnexion };
