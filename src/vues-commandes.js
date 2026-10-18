// Pages des commandes : liste, détail avec simulateur, écran « Payer ».
const config = require('./config');
const commandes = require('./commandes');
const { e, xaf, mise, jeton, lienWhatsapp } = require('./vues');

const urlCommande = (c) => '/commandes/' + encodeURIComponent(String(c.numero_commande).trim());

function badge(c) {
  const s = commandes.STATUTS[commandes.statutDe(c)];
  return `<span class="badge badge--${s.ton}">${e(s.libelle)}</span>`;
}

// Message sous le statut, pour que le client sache quoi faire.
function explicationStatut(c) {
  switch (commandes.statutDe(c)) {
    case 'en_attente_paiement':
      return `Montant à payer : <strong>${xaf(c.montant_attendu)}</strong>. Si vous avez déjà payé, la confirmation arrive en quelques minutes. Sinon, vous pouvez encore changer votre choix ci-dessous.`;
    case 'paye':
      return 'Paiement reçu, merci ! Votre document vous est envoyé sur WhatsApp.';
    case 'montant_different':
      return `Le montant reçu ne correspond pas au montant attendu (${xaf(c.montant_attendu)}). Écrivez-nous sur WhatsApp pour régulariser : votre document sera envoyé ensuite.`;
    case 'livre':
      return 'Votre document a été livré. Merci pour votre confiance !';
    default:
      return 'Choisissez avec ou sans impression, vérifiez le total, puis payez.';
  }
}

function pageMesCommandes(req, res, { liste }) {
  const cartes = liste.map((c) => `
        <li>
          <a class="ligne-commande" href="${urlCommande(c)}">
            <span>
              <span class="ligne-commande__numero">N° ${e(c.numero_commande)}</span>
              <span class="ligne-commande__type">${e(c.type_document || 'Document')}</span>
            </span>
            <span class="ligne-commande__droite">
              <span class="ligne-commande__prix">${commandes.prixFixe(c) ? xaf(commandes.prixFixe(c)) : '—'}</span>
              ${badge(c)}
            </span>
          </a>
        </li>`).join('');

  const vide = `
        <p class="espace__intro">Aucune commande n'est encore liée à votre adresse <strong>${e(res.locals.utilisateur.email)}</strong>.</p>
        <p class="espace__intro">Envoyez votre demande sur WhatsApp. Quand votre document est prêt et que vous avez vu l'aperçu, la commande apparaît ici avec son prix.</p>
        <a class="bouton bouton--plein" href="${e(lienWhatsapp('Bonjour DWTS, je souhaite commander un document (DEX).'))}" target="_blank" rel="noopener">Commander sur WhatsApp</a>`;

  return mise(req, res, {
    titre: 'Mes commandes',
    actif: 'compte',
    onglet: 'commandes',
    contenu: `
      <section class="carte-espace">
        <p class="surtitre">Espace client DEX</p>
        <h1 class="espace__titre">Mes commandes</h1>
        ${liste.length ? `<ul class="liste-commandes">${cartes}</ul>` : vide}
      </section>`,
  });
}

function pageCommande(req, res, { commande: c, choix, erreur }) {
  const r = config.regles;
  const fixe = commandes.prixFixe(c);
  const payable = commandes.peutPayer(c);
  const avec = choix && choix.impression;
  const valeurPages = (v) => (v === undefined || v === null || v === 0 ? '' : e(v));

  const simulateur = !payable ? '' : `
      <section class="carte-espace">
        <h2 class="espace__sous-titre">Votre choix</h2>
        ${erreur ? `<p class="alerte alerte--erreur" role="alert">${e(erreur)}</p>` : ''}
        <form method="get" action="${urlCommande(c)}/payer" data-simulateur
              data-fixe="${fixe}" data-couleur="${r.impression_page_couleur}" data-noir-blanc="${r.impression_page_noir_blanc}">
          <fieldset class="choix-impression">
            <legend class="sr-only">Impression</legend>
            <label class="option">
              <input type="radio" name="impression" value="non"${avec ? '' : ' checked'}>
              <span><strong>Sans impression</strong><br><small>Vous recevez le fichier sur WhatsApp</small></span>
            </label>
            <label class="option">
              <input type="radio" name="impression" value="oui"${avec ? ' checked' : ''}>
              <span><strong>Avec impression</strong><br><small>${xaf(r.impression_page_couleur)} la page couleur, ${xaf(r.impression_page_noir_blanc)} la page noir et blanc</small></span>
            </label>
          </fieldset>

          <div class="pages-impression" data-pages${avec ? '' : ' hidden'}>
            <div class="champ">
              <label for="couleur">Pages en couleur (avec photos ou images)</label>
              <input id="couleur" name="couleur" type="number" inputmode="numeric" min="0" max="2000" step="1" placeholder="0" value="${valeurPages(choix && choix.couleur)}">
            </div>
            <div class="champ">
              <label for="noir_blanc">Pages en noir et blanc</label>
              <input id="noir_blanc" name="noir_blanc" type="number" inputmode="numeric" min="0" max="2000" step="1" placeholder="0" value="${valeurPages(choix && choix.noirBlanc)}">
            </div>
          </div>

          <table class="detail-total" aria-live="polite">
            <tr><th scope="row">Prix fixe du document</th><td>${xaf(fixe)}</td></tr>
            <tr data-ligne-couleur${avec ? '' : ' hidden'}><th scope="row">Impression couleur : <span data-n-couleur>0</span> × ${xaf(r.impression_page_couleur)}</th><td data-m-couleur>0 XAF</td></tr>
            <tr data-ligne-nb${avec ? '' : ' hidden'}><th scope="row">Impression noir et blanc : <span data-n-nb>0</span> × ${xaf(r.impression_page_noir_blanc)}</th><td data-m-nb>0 XAF</td></tr>
            <tr class="detail-total__total"><th scope="row">Total à payer</th><td data-total>${xaf(fixe)}</td></tr>
          </table>

          <button class="bouton bouton--plein" type="submit">Continuer vers le paiement</button>
        </form>
      </section>`;

  return mise(req, res, {
    titre: 'Commande ' + c.numero_commande,
    actif: 'compte',
    onglet: 'commandes',
    contenu: `
      <p><a class="lien-retour" href="/mes-commandes">← Mes commandes</a></p>
      <section class="carte-espace">
        <p class="surtitre">Commande N° ${e(c.numero_commande)}</p>
        <h1 class="espace__titre">${e(c.type_document || 'Document')}</h1>
        <p>${badge(c)}</p>
        <dl class="infos">
          <div><dt>Prix fixe</dt><dd>${fixe ? xaf(fixe) : 'En attente'}</dd></div>
        </dl>
        <p class="alerte alerte--info">${fixe ? explicationStatut(c) : 'Le prix de cette commande n\'est pas encore fixé. Écrivez-nous sur WhatsApp.'}</p>
      </section>
      ${simulateur}`,
  });
}

function pagePayer(req, res, { commande: c, choix, detail }) {
  const r = config.regles;
  const lignes = [`<tr><th scope="row">Prix fixe du document</th><td>${xaf(detail.fixe)}</td></tr>`];
  if (choix.impression) {
    if (detail.couleur) lignes.push(`<tr><th scope="row">Impression couleur : ${detail.couleur} × ${xaf(r.impression_page_couleur)}</th><td>${xaf(detail.montantCouleur)}</td></tr>`);
    if (detail.noirBlanc) lignes.push(`<tr><th scope="row">Impression noir et blanc : ${detail.noirBlanc} × ${xaf(r.impression_page_noir_blanc)}</th><td>${xaf(detail.montantNoirBlanc)}</td></tr>`);
  } else {
    lignes.push('<tr><th scope="row">Impression</th><td>Sans</td></tr>');
  }
  lignes.push(`<tr class="detail-total__total"><th scope="row">Total</th><td>${xaf(detail.total)}</td></tr>`);

  return mise(req, res, {
    titre: 'Payer',
    actif: 'compte',
    onglet: 'commandes',
    contenu: `
      <p><a class="lien-retour" href="${urlCommande(c)}">← Modifier mon choix</a></p>
      <section class="carte-espace payer">
        <p class="surtitre">Commande N° ${e(c.numero_commande)} · ${e(c.type_document || 'Document')}</p>
        <h1 class="espace__titre">Payer</h1>
        <p class="payer__libelle">Montant exact à payer</p>
        <p class="payer__montant">${xaf(detail.total)}</p>
        <button class="bouton bouton--contour bouton--plein" type="button" data-copier="${detail.total}">Copier le montant (${detail.total})</button>

        <ol class="consignes">
          <li>Payez <strong>uniquement ce montant : ${xaf(detail.total)}</strong>.</li>
          <li>Sur Chariow, tapez <strong>exactement ${detail.total}</strong> dans le champ du montant à payer.</li>
          <li>Utilisez <strong>la même adresse e-mail</strong> que sur ce site : <strong>${e(res.locals.utilisateur.email)}</strong>.</li>
        </ol>
        <p class="alerte alerte--erreur">Si le montant ou l'e-mail est différent, votre paiement ne sera pas reconnu automatiquement et votre document ne sera pas envoyé tout de suite.</p>

        <table class="detail-total">${lignes.join('')}</table>

        <form method="post" action="${urlCommande(c)}/payer">
          ${jeton(res)}
          <input type="hidden" name="impression" value="${choix.impression ? 'oui' : 'non'}">
          <input type="hidden" name="couleur" value="${detail.couleur}">
          <input type="hidden" name="noir_blanc" value="${detail.noirBlanc}">
          <button class="bouton bouton--plein" type="submit">Payer ${xaf(detail.total)} sur Chariow</button>
        </form>
      </section>`,
  });
}

module.exports = { pageMesCommandes, pageCommande, pagePayer };
