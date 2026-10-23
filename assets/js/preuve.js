// Preuve de paiement (pages Paiement et Mon espace) :
// - SMS : collage seulement, puis verrouillé (le montant et le TID ne peuvent pas être retouchés) ;
// - capture : recadrage sur le paiement (cadre à déplacer et redimensionner au doigt ou à la souris).
(function () {
  // ---------- SMS collé ----------
  function verrouSms(zone, effacer) {
    var accepte = '';
    var collage = false;
    function verrouiller() {
      accepte = zone.value;
      zone.readOnly = !!accepte;
      zone.classList.toggle('sms-verrouille', !!accepte);
      effacer.hidden = !accepte;
    }
    zone.addEventListener('paste', function () { if (!zone.readOnly) collage = true; });
    zone.addEventListener('drop', function (e) { e.preventDefault(); });
    zone.addEventListener('beforeinput', function (e) {
      if (e.inputType === 'insertFromPaste' || (e.inputType === 'insertReplacementText' && collage)) return;
      if (!accepte && e.data && e.data.length >= 20) return; // presse-papiers du clavier (Gboard…) : un SMS entier d'un coup
      if (e.cancelable) e.preventDefault();
    });
    zone.addEventListener('input', function () {
      if (collage || (!accepte && zone.value.trim().length >= 20)) { collage = false; zone.value = zone.value.trim(); verrouiller(); return; }
      zone.value = accepte; // frappe au clavier : annulée
    });
    function vider() { zone.readOnly = false; zone.value = ''; verrouiller(); }
    effacer.addEventListener('click', function () { vider(); zone.focus(); });
    return { vider: vider };
  }

  // ---------- Capture recadrée ----------
  // options : { input, texte, zone (div .recadrage), image, cadre, retirer }
  function capture(o) {
    var r = { x: 0.05, y: 0.05, l: 0.9, h: 0.9 }; // cadre en fraction de l'image
    var MIN = 0.08;
    var fichier = null;

    function dessiner() {
      o.cadre.style.left = r.x * 100 + '%';
      o.cadre.style.top = r.y * 100 + '%';
      o.cadre.style.width = r.l * 100 + '%';
      o.cadre.style.height = r.h * 100 + '%';
    }
    function borner() {
      r.l = Math.min(1, Math.max(MIN, r.l));
      r.h = Math.min(1, Math.max(MIN, r.h));
      r.x = Math.min(1 - r.l, Math.max(0, r.x));
      r.y = Math.min(1 - r.h, Math.max(0, r.y));
    }

    // Glisser : le cadre (déplacer) ou une poignée (redimensionner)
    var geste = null;
    o.cadre.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      var boite = o.image.getBoundingClientRect();
      geste = { poignee: e.target.getAttribute('data-poignee') || 'deplacer', x: e.clientX, y: e.clientY, depart: Object.assign({}, r), l: boite.width, h: boite.height };
      o.cadre.setPointerCapture(e.pointerId);
    });
    o.cadre.addEventListener('pointermove', function (e) {
      if (!geste) return;
      var dx = (e.clientX - geste.x) / geste.l;
      var dy = (e.clientY - geste.y) / geste.h;
      var d = geste.depart;
      if (geste.poignee === 'deplacer') { r.x = d.x + dx; r.y = d.y + dy; r.l = d.l; r.h = d.h; }
      else {
        var p = geste.poignee;
        var gauche = d.x, haut = d.y, droite = d.x + d.l, bas = d.y + d.h;
        if (p.indexOf('o') !== -1) gauche = Math.min(droite - MIN, Math.max(0, d.x + dx));
        if (p.indexOf('e') !== -1) droite = Math.max(gauche + MIN, Math.min(1, d.x + d.l + dx));
        if (p.indexOf('n') !== -1) haut = Math.min(bas - MIN, Math.max(0, d.y + dy));
        if (p.indexOf('s') !== -1) bas = Math.max(haut + MIN, Math.min(1, d.y + d.h + dy));
        r.x = gauche; r.y = haut; r.l = droite - gauche; r.h = bas - haut;
      }
      borner();
      dessiner();
    });
    ['pointerup', 'pointercancel'].forEach(function (t) { o.cadre.addEventListener(t, function () { geste = null; }); });

    o.input.addEventListener('change', function () {
      fichier = o.input.files[0] || null;
      if (!fichier) return;
      o.image.onload = function () { r = { x: 0.05, y: 0.05, l: 0.9, h: 0.9 }; dessiner(); };
      o.image.src = URL.createObjectURL(fichier);
      o.zone.hidden = false;
      if (o.texte) o.texte.textContent = 'Changer de capture';
    });
    function vider() {
      fichier = null;
      o.input.value = '';
      o.zone.hidden = true;
      o.image.removeAttribute('src');
      if (o.texte) o.texte.textContent = 'Touchez ici pour choisir la capture';
    }
    if (o.retirer) o.retirer.addEventListener('click', vider);

    // Partie recadrée, en JPEG (1600 px maximum pour un envoi rapide en 3G), sans le préfixe data:
    function base64() {
      return new Promise(function (resolve, reject) {
        if (!fichier) { resolve(''); return; }
        var img = new Image();
        img.onload = function () {
          var sx = r.x * img.width, sy = r.y * img.height, sl = r.l * img.width, sh = r.h * img.height;
          var echelle = Math.min(1, 1600 / Math.max(sl, sh));
          var toile = document.createElement('canvas');
          toile.width = Math.round(sl * echelle);
          toile.height = Math.round(sh * echelle);
          var ctx = toile.getContext('2d');
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, toile.width, toile.height);
          ctx.drawImage(img, sx, sy, sl, sh, 0, 0, toile.width, toile.height);
          resolve(toile.toDataURL('image/jpeg', 0.85).split(',')[1]);
        };
        img.onerror = reject;
        img.src = URL.createObjectURL(fichier);
      });
    }
    return { base64: base64, vider: vider, aUneCapture: function () { return !!fichier; } };
  }

  // HTML du bloc capture (même aspect sur les deux pages)
  function htmlCapture(prefixe) {
    return '' +
      '<span style="font-weight:600;font-size:.95rem">La capture du paiement…</span>' +
      '<p class="aide-capture">Recadrez sur le paiement seulement : <b>montant, numéro qui reçoit, date et TID</b> doivent être bien lisibles.</p>' +
      '<label class="depot" for="' + prefixe + 'capture"><span id="' + prefixe + 'depot-texte">Touchez ici pour choisir la capture</span>' +
      '<input id="' + prefixe + 'capture" type="file" accept="image/*"></label>' +
      '<div class="recadrage" id="' + prefixe + 'recadrage" hidden>' +
      '<div class="recadrage__scene"><img id="' + prefixe + 'apercu" alt="Capture à recadrer">' +
      '<div class="recadrage__cadre" id="' + prefixe + 'cadre">' +
      '<i data-poignee="no"></i><i data-poignee="ne"></i><i data-poignee="so"></i><i data-poignee="se"></i></div></div>' +
      '<p><small>Faites glisser le cadre et ses coins : seule la partie encadrée est envoyée.</small></p>' +
      '<button type="button" class="mini-bouton" id="' + prefixe + 'retirer">Retirer la capture</button></div>';
  }

  // Monte le bloc capture dans un conteneur et renvoie l'outil
  function monterCapture(conteneur, prefixe) {
    conteneur.innerHTML = htmlCapture(prefixe);
    var g = function (id) { return document.getElementById(prefixe + id); };
    return capture({ input: g('capture'), texte: g('depot-texte'), zone: g('recadrage'), image: g('apercu'), cadre: g('cadre'), retirer: g('retirer') });
  }

  window.dwtsPreuve = { verrouSms: verrouSms, monterCapture: monterCapture };
})();
