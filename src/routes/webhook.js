// Réception des Pulses Chariow : POST /webhooks/chariow
// 1. vérifie la signature (HMAC sha256 du corps brut, comparaison à temps constant)
// 2. ignore les livraisons déjà reçues (x-pulse-delivery-id)
// 3. rapproche le paiement et répond 200 (en 1 à 2 secondes)
const crypto = require('crypto');
const express = require('express');
const config = require('../config');
const { traiterPulse } = require('../paiements');
const { crediterManquantes } = require('../commissions');

const routeur = express.Router();
const deliveriesTraitees = new Set(); // mémoire rapide ; le Sheet Pulses_recus fait foi

function signatureValide(corpsBrut, recue) {
  if (!config.chariowPulseSecret || typeof recue !== 'string' || !recue.startsWith('sha256=')) return false;
  const attendue = 'sha256=' + crypto.createHmac('sha256', config.chariowPulseSecret).update(corpsBrut).digest('hex');
  const a = Buffer.from(recue);
  const b = Buffer.from(attendue);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

routeur.post('/webhooks/chariow', express.raw({ type: () => true, limit: '1mb' }), async (req, res) => {
  const corps = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);

  if (!config.chariowPulseSecret) {
    console.error('Pulse reçu mais CHARIOW_PULSE_SECRET est vide.');
    return res.status(500).send('Not configured');
  }
  if (!signatureValide(corps, req.get('x-chariow-signature'))) {
    console.warn('Pulse refusé : signature invalide.');
    return res.status(401).send('Invalid signature');
  }

  const deliveryId = String(req.get('x-pulse-delivery-id') || '').slice(0, 200);
  if (!deliveryId) return res.status(400).send('Missing delivery id');
  if (deliveriesTraitees.has(deliveryId)) return res.status(200).send('OK');

  let payload;
  try {
    payload = JSON.parse(corps.toString('utf8'));
  } catch {
    return res.status(400).send('Invalid JSON');
  }

  try {
    const resultat = await traiterPulse(deliveryId, payload, req.get('x-pulse-event'));
    deliveriesTraitees.add(deliveryId);
    console.log(`Pulse ${deliveryId} : ${resultat}`);
    res.status(200).send('OK');
    // Commission du parrain, après la réponse à Chariow.
    if (resultat === 'paye') crediterManquantes().catch((err) => console.error('Commissions :', err.message));
    return undefined;
  } catch (err) {
    // Réponse 500 : Chariow renverra la livraison plus tard (10 s, 100 s, 17 min, 2 h 47).
    console.error(`Pulse ${deliveryId} non traité :`, err.message);
    return res.status(500).send('Retry later');
  }
});

module.exports = routeur;
