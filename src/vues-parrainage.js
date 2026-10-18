// Tableau de bord parrainage : solde, gains, versements, filleuls, historique.
const config = require('./config');
const { e, xaf, mise } = require('./vues');
const { dateCourte } = require('./dates');

// Bloc « Mon code parrain » (aussi affiché sur Mon compte).
function blocPartage(u) {
  const lienPartage = `${config.siteUrl}/inscription?parrain=${encodeURIComponent(u.code_parrain)}`;
  const message = `Je te recommande DEX (DWTS) pour tes CV, exposés, rapports et mémoires. Inscris-toi avec mon code parrain ${u.code_parrain} : ${lienPartage}`;
  return `
      <section class="carte-espace">
        <h2 class="espace__sous-titre">Mon code parrain</h2>
        <p class="code-parrain" aria-label="Votre code parrain">${e(u.code_parrain)}</p>
        <div class="actions">
          <button class="bouton bouton--contour bouton--petit" type="button" data-copier="${e(u.code_parrain)}">Copier le code</button>
        </div>
        <p class="espace__intro">Partagez ce lien : la personne qui s'inscrit avec devient votre filleul.</p>
        <p class="lien-partage">${e(lienPartage)}</p>
        <div class="actions">
          <button class="bouton bouton--contour bouton--petit" type="button" data-copier="${e(lienPartage)}">Copier le lien</button>
          <a class="bouton bouton--petit" href="https://wa.me/?text=${e(encodeURIComponent(message))}" target="_blank" rel="noopener">Partager sur WhatsApp</a>
        </div>
      </section>`;
}

function pageParrainage(req, res, { tdb }) {
  const u = res.locals.utilisateur;
  const r = config.regles;
  const solde = Math.max(tdb.solde, 0);
  const pourcentage = Math.min(100, Math.round((solde / tdb.minimum) * 100));
  const atteint = solde >= tdb.minimum;

  const filleuls = tdb.filleuls.length
    ? `<ul class="liste-simple">${tdb.filleuls.map((f) => `
          <li><span><strong>${e(f.nom)}</strong><small>Inscrit le ${e(dateCourte(f.date))} · ${f.commandes} commande${f.commandes > 1 ? 's' : ''} payée${f.commandes > 1 ? 's' : ''}</small></span><span class="montant">${xaf(f.gagne)}</span></li>`).join('')}
        </ul>`
    : '<p class="espace__intro">Pas encore de filleul. Partagez votre lien ci-dessous pour commencer.</p>';

  const historique = tdb.commissions.length
    ? `<ul class="liste-simple">${tdb.commissions.map((c) => `
          <li><span><strong>${e(c.filleul)}</strong><small>${e(dateCourte(c.date))} · commande N° ${e(c.numero)}</small></span><span class="montant montant--plus">+ ${xaf(c.montant)}</span></li>`).join('')}
        </ul>`
    : '<p class="espace__intro">Aucune commission pour le moment.</p>';

  const versements = tdb.versements.length ? `
      <section class="carte-espace">
        <h2 class="espace__sous-titre">Versements reçus</h2>
        <ul class="liste-simple">${tdb.versements.map((v) => `
          <li><span><strong>${e(dateCourte(v.date))}</strong><small>${e(v.moyen || 'Mobile Money')}</small></span><span class="montant">${xaf(v.montant)}</span></li>`).join('')}
        </ul>
      </section>` : '';

  return mise(req, res, {
    titre: 'Parrainage',
    actif: 'compte',
    onglet: 'parrainage',
    contenu: `
      <section class="carte-espace">
        <p class="surtitre">Mon parrainage</p>
        <p class="payer__libelle">Solde disponible</p>
        <p class="payer__montant">${xaf(tdb.solde)}</p>
        <div class="progression" role="progressbar" aria-valuemin="0" aria-valuemax="${tdb.minimum}" aria-valuenow="${Math.min(solde, tdb.minimum)}" aria-label="Progression vers le versement">
          <span style="width:${pourcentage}%"></span>
        </div>
        <p class="espace__intro progression__texte">${atteint
          ? `Bravo ! Votre solde dépasse ${xaf(tdb.minimum)} : il vous sera versé à la fin du mois sur Mobile Money.`
          : `Encore <strong>${xaf(tdb.minimum - solde)}</strong> pour atteindre ${xaf(tdb.minimum)}, le minimum de versement (payé chaque fin de mois).`}</p>
        <div class="chiffres">
          <div><span>Total gagné</span><strong>${xaf(tdb.totalGagne)}</strong></div>
          <div><span>Total versé</span><strong>${xaf(tdb.totalVerse)}</strong></div>
          <div><span>Filleuls</span><strong>${tdb.filleuls.length}</strong></div>
        </div>
      </section>

      <section class="carte-espace">
        <h2 class="espace__sous-titre">Mes filleuls</h2>
        ${filleuls}
      </section>

      <section class="carte-espace">
        <h2 class="espace__sous-titre">Historique des commissions</h2>
        ${historique}
      </section>
      ${versements}
      ${blocPartage(u)}

      <section class="carte-espace">
        <h2 class="espace__sous-titre">Comment je gagne ?</h2>
        <ul class="regles-parrain">
          <li>Chaque fois qu'un filleul paie une commande DEX, vous gagnez <strong>${xaf(r.commission_petite)}</strong> si son prix est de ${xaf(r.commission_seuil_prix_fixe)} ou moins, et <strong>${xaf(r.commission_grande)}</strong> au-delà.</li>
          <li>L'impression n'entre pas dans le calcul.</li>
          <li>Les gains sont versés chaque fin de mois sur Mobile Money, dès que votre solde atteint ${xaf(tdb.minimum)}.</li>
        </ul>
      </section>`,
  });
}

module.exports = { pageParrainage, blocPartage };
