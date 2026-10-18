// Espace client : boutons « Copier ».
(function () {
  function copier(texte) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(texte);
    var zone = document.createElement('textarea');
    zone.value = texte;
    zone.setAttribute('readonly', '');
    zone.style.position = 'fixed';
    zone.style.opacity = '0';
    document.body.appendChild(zone);
    zone.select();
    try { document.execCommand('copy'); } finally { document.body.removeChild(zone); }
    return Promise.resolve();
  }

  document.querySelectorAll('[data-copier]').forEach(function (bouton) {
    var libelle = bouton.textContent;
    bouton.addEventListener('click', function () {
      copier(bouton.getAttribute('data-copier')).then(function () {
        bouton.textContent = 'Copié ✔';
        setTimeout(function () { bouton.textContent = libelle; }, 2000);
      });
    });
  });
})();

// Simulateur : calcule le total en direct (le serveur refait toujours le calcul).
(function () {
  var form = document.querySelector('[data-simulateur]');
  if (!form) return;
  var fixe = Number(form.getAttribute('data-fixe'));
  var prixCouleur = Number(form.getAttribute('data-couleur'));
  var prixNb = Number(form.getAttribute('data-noir-blanc'));
  var $ = function (s) { return form.querySelector(s); };
  var xaf = function (n) { return n.toLocaleString('fr-FR').replace(/ | /g, ' ') + ' XAF'; };
  var entier = function (input) { var n = parseInt(input.value, 10); return n > 0 ? n : 0; };

  function maj() {
    var avec = $('input[name="impression"][value="oui"]').checked;
    var c = avec ? entier($('#couleur')) : 0;
    var nb = avec ? entier($('#noir_blanc')) : 0;
    $('[data-pages]').hidden = !avec;
    $('[data-ligne-couleur]').hidden = !avec;
    $('[data-ligne-nb]').hidden = !avec;
    $('[data-n-couleur]').textContent = c;
    $('[data-n-nb]').textContent = nb;
    $('[data-m-couleur]').textContent = xaf(c * prixCouleur);
    $('[data-m-nb]').textContent = xaf(nb * prixNb);
    $('[data-total]').textContent = xaf(fixe + c * prixCouleur + nb * prixNb);
  }
  form.addEventListener('input', maj);
  form.addEventListener('change', maj);
  maj();
})();
