// Rapprochement d'un paiement Chariow (Pulse "successful.sale") avec une commande.
// Règle : même e-mail + commande "en_attente_paiement".
//   montant payé = montant_attendu  → "paye"
//   montant payé ≠ montant_attendu  → "montant_different" (tu ne livres pas)
//   sinon                           → onglet Paiements_non_rapproches (à traiter à la main)
const sheets = require('./sheets');
const { normaliserEmail } = require('./utilisateurs');
const { statutDe, lireMontant } = require('./commandes');

const maintenant = () => new Date().toISOString();

// Extrait les informations utiles du Pulse.
function lirePulse(payload) {
  const sale = (payload && payload.sale) || {};
  const amount = sale.amount || {};
  const customer = (payload && payload.customer) || {};
  const valeur = Number(amount.value);
  return {
    evenement: String((payload && payload.event) || ''),
    venteId: String(sale.id || ''),
    email: normaliserEmail(customer.email),
    montant: Number.isFinite(valeur) ? valeur : NaN,
    devise: String(amount.currency || '').toUpperCase(),
  };
}

// Traite un Pulse déjà vérifié (signature correcte). Renvoie le résultat écrit dans Pulses_recus.
async function traiterPulse(deliveryId, payload, evenementEntete) {
  const p = lirePulse(payload);
  const evenement = p.evenement || evenementEntete || '';

  return sheets.transaction(async ({ lire, ajouter, modifier }) => {
    // 1. Déjà reçu ? (Chariow peut renvoyer la même livraison jusqu'à 5 fois)
    const recus = await lire('Pulses_recus');
    if (recus.some((r) => String(r.delivery_id) === deliveryId)) return 'deja_recu';

    const noter = (resultat) => ajouter('Pulses_recus', {
      delivery_id: deliveryId,
      evenement,
      date_reception: maintenant(),
      vente_chariow: p.venteId,
      email: p.email,
      montant: Number.isFinite(p.montant) ? p.montant : '',
      resultat,
    });
    const nonRapproche = async (raison) => {
      await ajouter('Paiements_non_rapproches', {
        date: maintenant(),
        vente_chariow: p.venteId,
        email: p.email,
        montant: Number.isFinite(p.montant) ? p.montant : '',
        raison,
        delivery_id: deliveryId,
      });
      await noter('non_rapproche');
      return 'non_rapproche';
    };

    // 2. Événements qu'on ne traite pas, et tests envoyés depuis Chariow.
    if (evenement !== 'successful.sale') { await noter('ignore'); return 'ignore'; }
    if (p.venteId.startsWith('test_')) { await noter('test'); return 'test'; }

    // 3. Données incomplètes ou inattendues.
    if (!p.venteId || !p.email || !Number.isFinite(p.montant)) return nonRapproche('Pulse incomplet (vente, e-mail ou montant manquant)');
    if (p.devise && p.devise !== 'XAF') return nonRapproche(`Devise inattendue : ${p.devise}`);
    if (!Number.isInteger(p.montant)) return nonRapproche(`Montant avec décimales : ${p.montant}`);

    const commandes = await lire('Commandes');

    // 4. Cette vente a déjà servi à payer une commande (ex. renvoi manuel depuis Chariow).
    const dejaLiee = commandes.find((c) => String(c.vente_chariow) === p.venteId);
    if (dejaLiee) { await noter(`vente_deja_rapprochee:${dejaLiee.numero_commande}`); return 'vente_deja_rapprochee'; }

    // 5. Commandes de ce client qui attendent un paiement (les plus anciennes d'abord).
    const enAttente = commandes.filter((c) => normaliserEmail(c.email_client) === p.email && statutDe(c) === 'en_attente_paiement');
    if (enAttente.length === 0) return nonRapproche('Aucune commande en attente de paiement pour cet e-mail');

    const champsPaiement = { montant_paye: p.montant, vente_chariow: p.venteId, date_paiement: maintenant(), date_maj: maintenant() };

    const exacte = enAttente.find((c) => lireMontant(c.montant_attendu) === p.montant);
    if (exacte) {
      await modifier('Commandes', exacte._ligne, { statut: 'paye', ...champsPaiement });
      await noter(`paye:${exacte.numero_commande}`);
      return 'paye';
    }

    if (enAttente.length === 1) {
      const c = enAttente[0];
      await modifier('Commandes', c._ligne, { statut: 'montant_different', ...champsPaiement });
      await noter(`montant_different:${c.numero_commande}`);
      return 'montant_different';
    }

    const numeros = enAttente.map((c) => `${c.numero_commande} (${lireMontant(c.montant_attendu)})`).join(', ');
    return nonRapproche(`Montant ${p.montant} différent de toutes les commandes en attente : ${numeros}`);
  });
}

module.exports = { traiterPulse, lirePulse };
