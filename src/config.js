// Réglages du site. Les secrets viennent des variables d'environnement (.env ou Railway).
require('dotenv').config({ quiet: true });

const env = process.env;

module.exports = {
  port: Number(env.PORT) || 3000,
  siteUrl: (env.SITE_URL || 'http://localhost:3000').replace(/\/+$/, ''),
  sessionSecret: env.SESSION_SECRET || '',
  googleSheetId: env.GOOGLE_SHEET_ID || '',
  googleServiceAccountJson: env.GOOGLE_SERVICE_ACCOUNT_JSON || '',
  chariowProductUrl: env.CHARIOW_PRODUCT_URL || '',
  chariowPulseSecret: env.CHARIOW_PULSE_SECRET || '',
  whatsappNumber: env.WHATSAPP_NUMBER || '24162671445',
  production: env.NODE_ENV === 'production',

  // Règles métier : modifiables ici (montants en XAF, sans décimales).
  regles: require('../config/regles.json'),
};
