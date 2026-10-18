// Simule un Pulse Chariow signé, pour tester sans vrai paiement.
//
// Exemples :
//   npm run simuler-pulse -- --email client@exemple.com --montant 2500
//   npm run simuler-pulse -- --email client@exemple.com --montant 2000 --url https://mon-site.up.railway.app
//   npm run simuler-pulse -- --email client@exemple.com --montant 2500 --mauvaise-signature
//
// Options : --email, --montant, --url (défaut SITE_URL), --vente (id de vente),
//           --delivery (id de livraison, pour tester les doublons), --evenement, --mauvaise-signature
const crypto = require('crypto');
const config = require('../src/config');

function options() {
  const o = {};
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (!args[i].startsWith('--')) continue;
    const cle = args[i].slice(2);
    const suivant = args[i + 1];
    if (suivant === undefined || suivant.startsWith('--')) o[cle] = true;
    else { o[cle] = suivant; i++; }
  }
  return o;
}

// Même format que Chariow : JSON compact, "/" échappés, caractères accentués en \uXXXX.
function encoderCommeChariow(objet) {
  return JSON.stringify(objet)
    .replace(/\//g, '\\/')
    .replace(/[\u007f-￿]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
}

(async () => {
  const o = options();
  if (!o.email || !o.montant) {
    console.log('Usage : npm run simuler-pulse -- --email client@exemple.com --montant 2500 [--url https://...]');
    process.exit(1);
  }
  const secret = o.secret || config.chariowPulseSecret;
  if (!secret) { console.error('CHARIOW_PULSE_SECRET est vide (fichier .env).'); process.exit(1); }

  const montant = Number(o.montant);
  const vente = o.vente || 'sal_simu_' + crypto.randomBytes(5).toString('hex');
  const delivery = o.delivery || 'dlv_simu_' + crypto.randomBytes(6).toString('hex');
  const evenement = o.evenement || 'successful.sale';
  const payload = {
    event: evenement,
    sale: {
      id: vente,
      amount: { value: montant, formatted: `${montant} FCFA`, short: String(montant), currency: 'XAF' },
      original_amount: { value: montant, formatted: `${montant} FCFA`, short: String(montant), currency: 'XAF' },
      discount_amount: { value: 0, formatted: '0 FCFA', short: '0', currency: 'XAF' },
      status: 'completed',
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      custom_fields: null,
      custom_metadata: null,
    },
    product: { id: 'prd_3kl67ry7', name: 'DEX - Saisie et mise en forme de documents', url: 'https://zbihtplg.mychariow.co/prd_3kl67ry7', metadata: null },
    customer: { id: 'cus_simu', name: 'Client Test', first_name: 'Client', last_name: 'Test', email: o.email, phone: '+24162671445', country: 'GA' },
    affiliate: null,
    store: { id: 'store_k5lgkhwzuar8', name: 'Digital world Technology', url: 'https://zbihtplg.mychariow.co' },
  };

  const corps = encoderCommeChariow(payload);
  let signature = 'sha256=' + crypto.createHmac('sha256', secret).update(corps).digest('hex');
  if (o['mauvaise-signature']) signature = 'sha256=' + '0'.repeat(64);

  const url = (o.url || config.siteUrl).replace(/\/+$/, '') + '/webhooks/chariow';
  console.log(`Envoi vers ${url}\n  e-mail : ${o.email}\n  montant : ${montant} XAF\n  vente : ${vente}\n  livraison : ${delivery}`);
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'user-agent': 'Pulse | Chariow +https://chariow.com',
      'x-chariow-signature': signature,
      'x-pulse-id': 'pulse_simulation',
      'x-pulse-delivery-id': delivery,
      'x-pulse-event': evenement,
    },
    body: corps,
  });
  console.log(`Réponse du site : ${r.status} ${await r.text()}`);
  console.log(r.status === 200 ? 'OK. Regarde les onglets Commandes et Pulses_recus du Sheet.' : 'Le site a refusé ce Pulse.');
})().catch((e) => { console.error('Erreur :', e.message); process.exit(1); });
