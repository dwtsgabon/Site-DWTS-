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
