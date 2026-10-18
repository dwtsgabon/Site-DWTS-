/* =========================================================
   DWTS — Script principal (commun aux 5 pages)

   Script « classique » (pas de module) : le site s'ouvre
   par simple double-clic sur index.html.

   Chaque bloc ci-dessous ne s'active que si la page contient
   les éléments concernés. Sommaire :
   1.  Réglages (numéro WhatsApp, détection tactile / mouvement réduit)
   2.  Navigation (fond au défilement, menu téléphone)
   3.  Curseur personnalisé
   4.  Apparitions au défilement
   5.  Entrée animée du hero
   6.  Scène 3D (Three.js)
   7.  Machine à écrire
   8.  Circuit SVG
   9.  Inclinaison 3D qui suit la souris
   10. Cartes retournables (DEX)
   11. Fenêtre de code (Logia)
   12. Galerie : révélation et parallaxe
   13. Tarifs : onglets, compteurs, liens de commande, halo
   14. Année du pied de page
   15-18. Pile DEX, atelier Visuo, filtres, visionneuse
   ========================================================= */

(function () {
  'use strict';

  /* ---------- 1. Réglages ---------- */

  // Numéro WhatsApp (format international, sans « + » ni espaces)
  var NUMERO_WHATSAPP = '24162671445';

  // Crée un lien WhatsApp avec un message pré-rempli
  function lienWhatsApp(message) {
    return 'https://wa.me/' + NUMERO_WHATSAPP + '?text=' + encodeURIComponent(message);
  }

  // L'utilisateur a-t-il demandé moins d'animations ?
  var mouvementReduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Écran tactile (téléphone, tablette) : pas de curseur perso, 3D allégée
  var tactile = window.matchMedia('(hover: none), (pointer: coarse)').matches;

  // Bibliothèques chargées par CDN (peuvent manquer sans connexion)
  var aGSAP = typeof window.gsap !== 'undefined';
  var aScrollTrigger = aGSAP && typeof window.ScrollTrigger !== 'undefined';
  if (aScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  // Raccourcis
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  // Met un nombre au format français : 15500 -> « 15 500 »
  function formatPrix(n) {
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }


  /* ---------- 2. Navigation ---------- */
  var nav = $('.nav');
  if (nav) {
    var majNav = function () { nav.classList.toggle('est-defilee', window.scrollY > 20); };
    majNav();
    window.addEventListener('scroll', majNav, { passive: true });

    var burger = $('.nav__burger');
    var fermerMenu = function () {
      document.body.classList.remove('menu-ouvert');
      if (burger) {
        burger.setAttribute('aria-expanded', 'false');
        burger.setAttribute('aria-label', 'Ouvrir le menu');
      }
    };
    if (burger) {
      burger.addEventListener('click', function () {
        var ouvert = document.body.classList.toggle('menu-ouvert');
        burger.setAttribute('aria-expanded', ouvert ? 'true' : 'false');
        burger.setAttribute('aria-label', ouvert ? 'Fermer le menu' : 'Ouvrir le menu');
      });
      $$('.nav__liens a').forEach(function (a) { a.addEventListener('click', fermerMenu); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') fermerMenu(); });
    }
  }


  /* ---------- 3. Curseur personnalisé (ordinateur uniquement) ---------- */
  if (!tactile && !mouvementReduit) {
    var point = document.createElement('div');
    var anneau = document.createElement('div');
    point.className = 'curseur';
    anneau.className = 'curseur-anneau';
    point.setAttribute('aria-hidden', 'true');
    anneau.setAttribute('aria-hidden', 'true');
    document.body.appendChild(point);
    document.body.appendChild(anneau);
    document.body.classList.add('a-curseur');

    var sx = innerWidth / 2, sy = innerHeight / 2; // position de la souris
    var ax = sx, ay = sy;                          // position de l'anneau (suit avec retard)
    window.addEventListener('pointermove', function (e) {
      sx = e.clientX; sy = e.clientY;
      point.style.transform = 'translate3d(' + sx + 'px,' + sy + 'px,0)';
    }, { passive: true });

    (function boucleCurseur() {
      ax += (sx - ax) * 0.18;
      ay += (sy - ay) * 0.18;
      anneau.style.transform = 'translate3d(' + ax + 'px,' + ay + 'px,0)';
      requestAnimationFrame(boucleCurseur);
    })();

    // L'anneau grossit sur les éléments cliquables
    document.addEventListener('pointerover', function (e) {
      if (e.target.closest('a, button, [data-incline]')) anneau.classList.add('survol');
    });
    document.addEventListener('pointerout', function (e) {
      if (e.target.closest('a, button, [data-incline]')) anneau.classList.remove('survol');
    });
    // Cache le curseur quand la souris quitte la fenêtre
    document.addEventListener('mouseleave', function () { point.style.opacity = anneau.style.opacity = '0'; });
    document.addEventListener('mouseenter', function () { point.style.opacity = anneau.style.opacity = ''; });
  }


  /* ---------- 4. Apparitions au défilement ----------
     Ajoutez la classe "apparait" à n'importe quel élément pour
     qu'il glisse vers le haut quand il entre à l'écran.
     Un retard est possible : style="--delai: .2s" */
  var aApparaitre = $$('.apparait');
  if ('IntersectionObserver' in window && !mouvementReduit) {
    var obsApparition = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (entree) {
        if (entree.isIntersecting) {
          entree.target.classList.add('est-visible');
          obsApparition.unobserve(entree.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    aApparaitre.forEach(function (el) { obsApparition.observe(el); });
  } else {
    aApparaitre.forEach(function (el) { el.classList.add('est-visible'); });
  }


  /* ---------- 5. Entrée animée du hero ---------- */
  var intros = $$('.intro');
  if (intros.length) {
    if (aGSAP && !mouvementReduit) {
      var tl = gsap.timeline({ defaults: { ease: 'power4.out' }, delay: 0.15 });
      intros.forEach(function (el) {
        var lignes = $$('.ligne > span', el);
        if (lignes.length) {
          // Titre : chaque ligne monte depuis un masque
          tl.set(el, { opacity: 1 }, 0);
          tl.fromTo(lignes, { yPercent: 115 }, { yPercent: 0, duration: 1.3, stagger: 0.12 }, 0.05);
        } else {
          tl.fromTo(el, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 1 }, '-=0.95');
        }
      });
    }
    // Retire la sécurité CSS (et rend visible si GSAP est absent)
    intros.forEach(function (el) { el.classList.add('intro-faite'); });
  }


  /* ---------- 6. Scène 3D (Three.js) ----------
     Le <canvas class="hero__scene"> porte deux réglages :
     data-forme   : "sphere" | "noeud" | "cube" | "icosaedre"
     data-couleur : couleur principale (ex. "#FF6A00")
     data-couleur2: couleur secondaire (optionnelle) */
  var toile = $('.hero__scene');
  if (toile && typeof window.THREE !== 'undefined') {
    try { scene3D(toile); } catch (err) { /* sans WebGL : le fond CSS reste visible */ }
  }

  function scene3D(canvas) {
    var forme = canvas.getAttribute('data-forme') || 'sphere';
    var couleur = new THREE.Color(canvas.getAttribute('data-couleur') || '#FF6A00');
    var couleur2 = new THREE.Color(canvas.getAttribute('data-couleur2') || canvas.getAttribute('data-couleur') || '#FF6A00');

    var rendu = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: !tactile, powerPreference: 'high-performance' });
    // Limite de résolution : fluide même sur les écrans très denses
    rendu.setPixelRatio(Math.min(window.devicePixelRatio || 1, tactile ? 1.25 : 1.75));

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.z = 7;

    var groupe = new THREE.Group();   // tourne avec la souris
    scene.add(groupe);

    // Petite texture ronde et lumineuse pour les points
    var tex = (function () {
      var c = document.createElement('canvas');
      c.width = c.height = 64;
      var g = c.getContext('2d');
      var grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.35, 'rgba(255,255,255,.85)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(c);
    })();

    function materielPoints(col, taille, opacite) {
      return new THREE.PointsMaterial({
        color: col, size: taille, map: tex, transparent: true, opacity: opacite,
        depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true
      });
    }
    function filDeFer(geo, col, opacite) {
      return new THREE.LineSegments(
        new THREE.WireframeGeometry(geo),
        new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: opacite })
      );
    }
    function aretes(geo, col, opacite) {
      return new THREE.LineSegments(
        new THREE.EdgesGeometry(geo),
        new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: opacite })
      );
    }

    // --- Nuage de points répartis sur une sphère (spirale de Fibonacci) ---
    function sphereDePoints(nombre, rayon) {
      var pos = new Float32Array(nombre * 3);
      var dore = Math.PI * (3 - Math.sqrt(5));
      for (var i = 0; i < nombre; i++) {
        var y = 1 - (i / (nombre - 1)) * 2;
        var r = Math.sqrt(1 - y * y);
        var t = dore * i;
        pos[i * 3] = Math.cos(t) * r * rayon;
        pos[i * 3 + 1] = y * rayon;
        pos[i * 3 + 2] = Math.sin(t) * r * rayon;
      }
      var geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      return geo;
    }

    // --- Poussière d'étoiles autour (profondeur) ---
    function poussiere(nombre) {
      var pos = new Float32Array(nombre * 3);
      for (var i = 0; i < nombre; i++) {
        var r = 4 + Math.random() * 6;
        var th = Math.random() * Math.PI * 2;
        var ph = Math.acos(2 * Math.random() - 1);
        pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
        pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
        pos[i * 3 + 2] = r * Math.cos(ph) - 3;
      }
      var geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      return geo;
    }

    var objet = new THREE.Group();     // la forme principale (tourne seule)
    var nuage;                         // le nuage de points
    var nbPoints = tactile ? 700 : 1600;

    if (forme === 'noeud') {
      // DEX : nœud de tore bleu
      var geoN = new THREE.TorusKnotGeometry(1.25, 0.36, tactile ? 90 : 150, tactile ? 10 : 14);
      objet.add(filDeFer(geoN, couleur, 0.32));
      objet.add(new THREE.Points(geoN, materielPoints(couleur2, 0.05, 0.9)));
      nuage = new THREE.Points(sphereDePoints(Math.round(nbPoints * 0.6), 2.9), materielPoints(couleur, 0.03, 0.55));
    } else if (forme === 'cube') {
      // Visuo : cube orange en fil de fer, cube violet à l'intérieur
      var geoC = new THREE.BoxGeometry(2.3, 2.3, 2.3, 4, 4, 4);
      objet.add(aretes(new THREE.BoxGeometry(2.3, 2.3, 2.3), couleur, 1));
      objet.add(filDeFer(geoC, couleur, 0.18));
      var interieur = aretes(new THREE.BoxGeometry(1.2, 1.2, 1.2), couleur2, 0.95);
      interieur.rotation.set(0.6, 0.6, 0);
      objet.add(interieur);
      objet.userData.interieur = interieur;
      objet.add(new THREE.Points(geoC, materielPoints(couleur, 0.07, 0.95)));
      nuage = new THREE.Points(sphereDePoints(Math.round(nbPoints * 0.6), 3), materielPoints(couleur2, 0.03, 0.6));
    } else if (forme === 'icosaedre') {
      // Logia : icosaèdre cyan
      var geoI = new THREE.IcosahedronGeometry(1.7, 0);
      objet.add(aretes(geoI, couleur, 1));
      objet.add(filDeFer(new THREE.IcosahedronGeometry(1.7, 2), couleur2, 0.16));
      objet.add(new THREE.Points(geoI, materielPoints(couleur, 0.18, 1)));
      nuage = new THREE.Points(sphereDePoints(Math.round(nbPoints * 0.7), 2.8), materielPoints(couleur, 0.03, 0.55));
    } else {
      // Accueil : sphère de points orange + icosaèdre en fil de fer
      objet.add(filDeFer(new THREE.IcosahedronGeometry(1.35, 1), couleur2, 0.5));
      nuage = new THREE.Points(sphereDePoints(nbPoints, 2.3), materielPoints(couleur, 0.045, 0.95));
    }

    groupe.add(objet);
    groupe.add(nuage);
    var etoiles = new THREE.Points(poussiere(tactile ? 250 : 600), materielPoints(0xffffff, 0.035, 0.35));
    scene.add(etoiles);

    // --- Taille et position (à droite sur ordinateur, centré sur téléphone) ---
    function redimensionner() {
      var l = canvas.clientWidth, h = canvas.clientHeight;
      if (!l || !h) return;
      rendu.setSize(l, h, false);
      camera.aspect = l / h;
      camera.updateProjectionMatrix();
      var large = l > 900;
      groupe.position.x = large ? 2.1 : 0;
      groupe.position.y = large ? 0 : 0.6;
      var echelle = large ? 1 : 0.78;
      groupe.scale.set(echelle, echelle, echelle);
    }
    redimensionner();
    window.addEventListener('resize', redimensionner);

    // --- Parallaxe : la scène suit la souris ---
    var cibleX = 0, cibleY = 0;
    if (!tactile) {
      window.addEventListener('pointermove', function (e) {
        cibleX = (e.clientX / innerWidth - 0.5) * 2;
        cibleY = (e.clientY / innerHeight - 0.5) * 2;
      }, { passive: true });
    }

    // --- On n'anime que si le hero est visible et l'onglet actif ---
    var visible = true;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(canvas);
    }

    var horloge = new THREE.Clock();
    function image() {
      var t = horloge.getElapsedTime();
      objet.rotation.y = t * 0.25;
      objet.rotation.x = Math.sin(t * 0.3) * 0.25;
      if (objet.userData.interieur) {
        objet.userData.interieur.rotation.x = -t * 0.5;
        objet.userData.interieur.rotation.y = -t * 0.4;
      }
      nuage.rotation.y = -t * 0.06;
      etoiles.rotation.y = t * 0.01;
      // Mouvement doux vers la position de la souris
      groupe.rotation.y += (cibleX * 0.45 - groupe.rotation.y) * 0.05;
      groupe.rotation.x += (cibleY * 0.3 - groupe.rotation.x) * 0.05;
      camera.position.x += (cibleX * 0.35 - camera.position.x) * 0.04;
      camera.position.y += (-cibleY * 0.25 - camera.position.y) * 0.04;
      camera.lookAt(0, 0, 0);
      rendu.render(scene, camera);
    }

    if (mouvementReduit) {
      image();                         // une seule image fixe
      window.addEventListener('resize', image);
      return;
    }

    (function boucle() {
      requestAnimationFrame(boucle);
      if (visible && !document.hidden) image();
    })();
  }


  /* ---------- 7. Machine à écrire ----------
     <span data-machine='["Mot 1.", "Mot 2."]'></span> */
  $$('[data-machine]').forEach(function (zone) {
    var mots;
    try { mots = JSON.parse(zone.getAttribute('data-machine')); } catch (e) { return; }
    if (!mots || !mots.length) return;

    var texte = document.createElement('span');
    texte.className = 'machine-texte';
    var curseur = document.createElement('span');
    curseur.className = 'machine-curseur';
    zone.textContent = '';
    zone.appendChild(texte);
    zone.appendChild(curseur);

    var i = 0;
    if (mouvementReduit) {
      // Pas d'effet de frappe : les phrases changent simplement
      texte.textContent = mots[0];
      setInterval(function () { i = (i + 1) % mots.length; texte.textContent = mots[i]; }, 3000);
      return;
    }

    var lettre = 0, efface = false;
    function taper() {
      var mot = mots[i];
      if (!efface) {
        lettre++;
        texte.textContent = mot.slice(0, lettre);
        if (lettre === mot.length) { efface = true; return setTimeout(taper, 1700); }
        return setTimeout(taper, 55 + Math.random() * 50);
      }
      lettre--;
      texte.textContent = mot.slice(0, lettre);
      if (lettre === 0) { efface = false; i = (i + 1) % mots.length; return setTimeout(taper, 350); }
      setTimeout(taper, 28);
    }
    setTimeout(taper, 1200);
  });


  /* ---------- 8. Circuit SVG : se dessine à l'entrée ---------- */
  $$('.circuit').forEach(function (svg) {
    setTimeout(function () { svg.classList.add('dessine'); }, mouvementReduit ? 0 : 700);
  });


  /* ---------- 9. Inclinaison 3D qui suit la souris ----------
     Ajoutez data-incline="10" (angle maximum en degrés). */
  if (!tactile && !mouvementReduit) {
    $$('[data-incline]').forEach(function (carte) {
      var max = parseFloat(carte.getAttribute('data-incline')) || 10;
      var enAttente = false, ex = 0, ey = 0;
      carte.addEventListener('pointermove', function (e) {
        ex = e.clientX; ey = e.clientY;
        if (enAttente) return;
        enAttente = true;
        requestAnimationFrame(function () {
          enAttente = false;
          var r = carte.getBoundingClientRect();
          var px = (ex - r.left) / r.width;
          var py = (ey - r.top) / r.height;
          carte.style.setProperty('--ry', ((px - 0.5) * 2 * max).toFixed(2) + 'deg');
          carte.style.setProperty('--rx', ((0.5 - py) * 2 * max).toFixed(2) + 'deg');
          carte.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
          carte.style.setProperty('--my', (py * 100).toFixed(1) + '%');
        });
      });
      carte.addEventListener('pointerleave', function () {
        carte.style.setProperty('--rx', '0deg');
        carte.style.setProperty('--ry', '0deg');
      });
    });
  }


  /* ---------- 10. Cartes retournables (DEX) ----------
     Survol (ordinateur) ou clic / toucher / touche Entrée. */
  $$('.carte-mode').forEach(function (carte) {
    var bouton = $('.carte-mode__bouton', carte);
    if (!bouton) return;
    var retourner = function () {
      var retournee = carte.classList.toggle('est-retournee');
      bouton.setAttribute('aria-pressed', retournee ? 'true' : 'false');
    };
    bouton.addEventListener('click', retourner);
    // Au clavier : Entrée ou Espace
    bouton.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); retourner(); }
    });
    if (!tactile) {
      carte.addEventListener('mouseleave', function () {
        carte.classList.remove('est-retournee');
        bouton.setAttribute('aria-pressed', 'false');
      });
    }
  });


  /* ---------- 11. Fenêtre de code (Logia) ----------
     Chaque ligne est une liste de morceaux [texte, classe de couleur]. */
  var corpsTerminal = $('[data-terminal]');
  if (corpsTerminal) {
    var LIGNES = [
      [['const ', 'mot-cle'], ['dwts', 'variable'], [' = ', ''], ['await ', 'mot-cle'], ['logia', 'variable'], ['.', ''], ['automatiser', 'fonction'], ['();', '']],
      [['› Bot WhatsApp en ligne ✔', 'ok']],
      [['› Suivi mensuel activé ✔', 'ok']]
    ];

    var curseurT = document.createElement('span');
    curseurT.className = 'terminal__curseur';

    function nouvelleLigne(num) {
      var l = document.createElement('div');
      l.className = 'terminal__ligne';
      var b = document.createElement('b');
      b.textContent = num;
      var c = document.createElement('span');
      l.appendChild(b);
      l.appendChild(c);
      corpsTerminal.appendChild(l);
      return c;
    }

    // Affiche tout d'un coup (mouvement réduit)
    function toutAfficher() {
      corpsTerminal.textContent = '';
      LIGNES.forEach(function (morceaux, n) {
        var c = nouvelleLigne(n + 1);
        morceaux.forEach(function (m) {
          var s = document.createElement('span');
          s.className = m[1];
          s.textContent = m[0];
          c.appendChild(s);
        });
      });
    }

    function jouer() {
      corpsTerminal.textContent = '';
      var n = 0;
      function ligneSuivante() {
        if (n >= LIGNES.length) {
          // Fin : pause, puis on recommence
          return setTimeout(jouer, 4500);
        }
        var cible = nouvelleLigne(n + 1);
        var morceaux = LIGNES[n];
        var vitesse = n === 0 ? 55 : 22;   // le code s'écrit, les messages s'affichent vite
        var m = 0, k = 0, span = null;
        (function taper() {
          if (m >= morceaux.length) {
            n++;
            return setTimeout(ligneSuivante, n === 1 ? 700 : 500);
          }
          if (!span) {
            span = document.createElement('span');
            span.className = morceaux[m][1];
            cible.appendChild(span);
          }
          k++;
          span.textContent = morceaux[m][0].slice(0, k);
          cible.appendChild(curseurT);
          if (k >= morceaux[m][0].length) { m++; k = 0; span = null; }
          setTimeout(taper, vitesse + Math.random() * 30);
        })();
      }
      ligneSuivante();
    }

    if (mouvementReduit) {
      toutAfficher();
    } else if ('IntersectionObserver' in window) {
      var obsT = new IntersectionObserver(function (e) {
        if (e[0].isIntersecting) { obsT.disconnect(); jouer(); }
      }, { threshold: 0.4 });
      obsT.observe(corpsTerminal);
    } else {
      jouer();
    }
  }


  /* ---------- 12. Galerie : révélation et parallaxe ---------- */
  if (aScrollTrigger && !mouvementReduit) {
    $$('.galerie__cadre').forEach(function (cadre) {
      var img = $('.galerie__image', cadre);
      var legende = $('.galerie__legende', cadre);

      // Révélation : l'image s'ouvre de bas en haut
      gsap.fromTo(cadre,
        { clipPath: 'inset(100% 0% 0% 0% round 22px)' },
        { clipPath: 'inset(0% 0% 0% 0% round 22px)', duration: 1.5, ease: 'power3.inOut',
          scrollTrigger: { trigger: cadre, start: 'top 85%' } });
      if (img) {
        gsap.fromTo(img, { scale: 1.3 }, { scale: 1, duration: 1.8, ease: 'power3.out',
          scrollTrigger: { trigger: cadre, start: 'top 85%' } });
        // Parallaxe : l'image glisse moins vite que la page
        gsap.fromTo(img, { yPercent: -8 }, { yPercent: 8, ease: 'none',
          scrollTrigger: { trigger: cadre, start: 'top bottom', end: 'bottom top', scrub: true } });
      }
      if (legende) {
        gsap.fromTo(legende.children, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 1, stagger: 0.12, ease: 'power3.out',
          scrollTrigger: { trigger: cadre, start: 'top 55%' } });
      }
    });
  }


  /* ---------- 13. Tarifs ---------- */
  var listeOnglets = $('[role="tablist"]');
  if (listeOnglets) {
    var onglets = $$('[role="tab"]', listeOnglets);
    var fond = $('.onglet__fond', listeOnglets);
    var panneaux = onglets.map(function (o) { return document.getElementById(o.getAttribute('aria-controls')); });

    // --- Compteurs : les prix comptent de 0 à leur valeur ---
    function compter(panneau) {
      $$('[data-compte]', panneau).forEach(function (el) {
        // La valeur vient du texte écrit dans le HTML (un seul endroit à modifier)
        if (!el.hasAttribute('data-valeur')) el.setAttribute('data-valeur', el.textContent.replace(/\D/g, ''));
        var valeur = parseInt(el.getAttribute('data-valeur'), 10) || 0;
        if (mouvementReduit) { el.textContent = formatPrix(valeur); return; }
        var debut = null, duree = 1300;
        (function pas(t) {
          if (!debut) debut = t;
          var p = Math.min((t - debut) / duree, 1);
          var adouci = 1 - Math.pow(1 - p, 4);           // ralentit à la fin
          el.textContent = formatPrix(valeur * adouci);
          if (p < 1) requestAnimationFrame(pas);
        })(performance.now());
      });
    }

    // --- Liens de commande WhatsApp sur chaque vignette ---
    panneaux.forEach(function (panneau) {
      var branche = panneau.getAttribute('data-branche') || '';
      $$('.vignette', panneau).forEach(function (v) {
        var carte = v.closest('.carte-prix');
        var service = carte ? $('h3', carte).textContent.trim() : '';
        var niveau = $('.vignette__niveau', v);
        var prixEl = $('[data-compte]', v) || (carte ? $('[data-compte]', carte) : null);
        var prix = prixEl ? prixEl.textContent.replace(/\D/g, '') : '';
        var msg = 'Bonjour DWTS, je souhaite commander (' + branche + ') : ' + service +
          (niveau ? ' — ' + niveau.textContent.trim() : '') +
          (prix ? ', ' + formatPrix(prix).replace(/ /g, ' ') + ' XAF.' : '.');
        v.setAttribute('href', lienWhatsApp(msg));
      });
    });

    // --- Pastille qui glisse sous l'onglet actif ---
    function placerFond(onglet, panneau) {
      if (!fond) return;
      fond.style.width = onglet.offsetWidth + 'px';
      fond.style.transform = 'translateX(' + onglet.offsetLeft + 'px)';
      fond.style.background = getComputedStyle(panneau).getPropertyValue('--g');
    }

    var actif = 0;
    function activer(index, focus) {
      if (index === actif && !panneaux[index].hidden) return;
      var ancien = panneaux[actif];
      var nouveau = panneaux[index];
      onglets.forEach(function (o, n) {
        o.setAttribute('aria-selected', n === index ? 'true' : 'false');
        o.tabIndex = n === index ? 0 : -1;
      });
      if (focus) onglets[index].focus();
      placerFond(onglets[index], nouveau);
      if (history.replaceState) history.replaceState(null, '', '#' + nouveau.id.replace('panneau-', ''));
      actif = index;

      var montrer = function () {
        panneaux.forEach(function (p) { p.hidden = p !== nouveau; p.classList.remove('sort', 'entre'); });
        if (!mouvementReduit) nouveau.classList.add('entre');
        compter(nouveau);
        if (aScrollTrigger) ScrollTrigger.refresh();
      };
      if (mouvementReduit || ancien === nouveau || ancien.hidden) return montrer();
      ancien.classList.add('sort');
      setTimeout(montrer, 250);
    }

    onglets.forEach(function (o, n) {
      o.addEventListener('click', function () { activer(n); });
      // Flèches gauche / droite au clavier
      o.addEventListener('keydown', function (e) {
        var cible = null;
        if (e.key === 'ArrowRight') cible = (n + 1) % onglets.length;
        if (e.key === 'ArrowLeft') cible = (n - 1 + onglets.length) % onglets.length;
        if (e.key === 'Home') cible = 0;
        if (e.key === 'End') cible = onglets.length - 1;
        if (cible !== null) { e.preventDefault(); activer(cible, true); }
      });
    });

    // Onglet de départ : celui de l'adresse (tarifs.html#visuo), sinon DEX
    var depart = 0;
    var ancre = location.hash.replace('#', '');
    onglets.forEach(function (o, n) { if (o.getAttribute('aria-controls') === 'panneau-' + ancre) depart = n; });
    actif = depart;
    onglets.forEach(function (o, n) {
      o.setAttribute('aria-selected', n === depart ? 'true' : 'false');
      o.tabIndex = n === depart ? 0 : -1;
    });
    panneaux.forEach(function (p, n) { p.hidden = n !== depart; });
    placerFond(onglets[depart], panneaux[depart]);
    window.addEventListener('resize', function () { placerFond(onglets[actif], panneaux[actif]); });
    // Les polices chargées changent la largeur des onglets : on recale
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { placerFond(onglets[actif], panneaux[actif]); });

    // Le premier panneau compte quand il apparaît à l'écran
    if ('IntersectionObserver' in window) {
      var obsP = new IntersectionObserver(function (e) {
        if (e[0].isIntersecting) { obsP.disconnect(); compter(panneaux[actif]); }
      }, { threshold: 0.1 });
      obsP.observe(panneaux[depart]);
    } else {
      compter(panneaux[depart]);
    }
  }

  // --- Halo orange qui suit la souris ---
  var halo = $('.halo');
  if (halo && !mouvementReduit && !tactile) {
    var hx = innerWidth / 2, hy = innerHeight * 0.4, cx = hx, cy = hy, enCours = false;
    var animerHalo = function () {
      cx += (hx - cx) * 0.08;
      cy += (hy - cy) * 0.08;
      halo.style.transform = 'translate3d(' + cx + 'px,' + cy + 'px,0)';
      // On s'arrête quand le halo a rejoint la souris (économise la batterie)
      if (Math.abs(hx - cx) > 0.5 || Math.abs(hy - cy) > 0.5) requestAnimationFrame(animerHalo);
      else enCours = false;
    };
    window.addEventListener('pointermove', function (e) {
      hx = e.clientX; hy = e.clientY;
      if (!enCours) { enCours = true; requestAnimationFrame(animerHalo); }
    }, { passive: true });
  }


  /* ---------- 15. DEX : pile de pages qui s'ouvre et suit la souris ---------- */
  var pile = $('[data-pile]');
  if (pile) {
    setTimeout(function () { pile.classList.add('est-ouverte'); }, mouvementReduit ? 0 : 300);
    var corps = $('.pile__corps', pile);
    if (corps && !tactile && !mouvementReduit) {
      window.addEventListener('pointermove', function (e) {
        var x = e.clientX / innerWidth - 0.5, y = e.clientY / innerHeight - 0.5;
        corps.style.setProperty('--ry', (-14 + x * 16).toFixed(1) + 'deg');
        corps.style.setProperty('--rx', (8 - y * 10).toFixed(1) + 'deg');
      }, { passive: true });
    }
  }


  /* ---------- 16. VISUO : plan de travail, règles, nuancier ---------- */
  // Le tracé à la plume se dessine quand il est visible
  $$('[data-trace]').forEach(function (el) {
    if (mouvementReduit || !('IntersectionObserver' in window)) { el.classList.add('est-dessine'); return; }
    var o = new IntersectionObserver(function (e) {
      if (e[0].isIntersecting) { el.classList.add('est-dessine'); o.disconnect(); }
    }, { threshold: 0.3 });
    o.observe(el);
  });

  // Repères orange sur les règles : suivent la souris
  var regleH = $('.regle--h'), regleV = $('.regle--v');
  if (regleH && regleV && !tactile) {
    window.addEventListener('pointermove', function (e) {
      regleH.style.setProperty('--sx', e.clientX + 'px');
      var r = regleV.getBoundingClientRect();
      regleV.style.setProperty('--sy', (e.clientY - r.top) + 'px');
    }, { passive: true });
  }

  // Taille affichée sous le titre sélectionné (vraie taille en pixels)
  var selection = $('.selection');
  var tailleSel = $('.selection__taille');
  if (selection && tailleSel) {
    var majTaille = function () {
      tailleSel.textContent = 'L ' + Math.round(selection.offsetWidth) + ' × H ' + Math.round(selection.offsetHeight);
    };
    majTaille();
    window.addEventListener('resize', majTaille);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(majTaille);
  }

  // Nuancier : chaque pastille change les couleurs du grand titre
  var nuances = $$('.nuance');
  nuances.forEach(function (n) {
    n.addEventListener('click', function () {
      var hero = n.closest('.hero');
      if (!hero) return;
      hero.style.setProperty('--accent', n.getAttribute('data-c1'));
      hero.style.setProperty('--accent-2', n.getAttribute('data-c2'));
      nuances.forEach(function (x) { x.setAttribute('aria-pressed', x === n ? 'true' : 'false'); });
    });
  });


  /* ---------- 17. Réalisations : filtres ---------- */
  $$('[data-filtres]').forEach(function (groupe) {
    var section = groupe.closest('section') || document;
    var boutons = $$('[data-filtre]', groupe);
    boutons.forEach(function (b) {
      b.addEventListener('click', function () {
        var f = b.getAttribute('data-filtre');
        boutons.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        $$('[data-cat]', section).forEach(function (item) {
          var montrer = f === 'tous' || item.getAttribute('data-cat').split(' ').indexOf(f) !== -1;
          item.classList.toggle('est-masque', !montrer);
          if (montrer && !mouvementReduit && item.animate) {
            item.animate([{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], { duration: 450, easing: 'cubic-bezier(.2,.8,.2,1)' });
          }
        });
      });
    });
  });


  /* ---------- 18. Visionneuse (clic sur une réalisation) ----------
     <button data-pages="a.jpg|b.jpg" data-titre="…" data-sous="…"> */
  var ouvrables = $$('[data-pages]');
  if (ouvrables.length) {
    var icone = function (d) { return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + d + '"/></svg>'; };
    var v = document.createElement('div');
    v.className = 'visionneuse';
    v.hidden = true;
    v.setAttribute('role', 'dialog');
    v.setAttribute('aria-modal', 'true');
    v.setAttribute('aria-label', 'Aperçu de la réalisation');
    v.innerHTML =
      '<div class="visionneuse__haut"><p class="visionneuse__titre"></p>' +
      '<button class="visionneuse__btn" data-fermer aria-label="Fermer l\'aperçu">' + icone('M6 6l12 12M18 6L6 18') + '</button></div>' +
      '<div class="visionneuse__scene"><img alt="">' +
      '<button class="visionneuse__btn visionneuse__prec" aria-label="Page précédente">' + icone('M15 5l-7 7 7 7') + '</button>' +
      '<button class="visionneuse__btn visionneuse__suiv" aria-label="Page suivante">' + icone('M9 5l7 7-7 7') + '</button></div>' +
      '<div class="visionneuse__bas"><div class="visionneuse__vignettes"></div><span class="visionneuse__compteur"></span></div>';
    document.body.appendChild(v);

    var vImg = $('.visionneuse__scene img', v), vTitre = $('.visionneuse__titre', v);
    var vCompteur = $('.visionneuse__compteur', v), vVign = $('.visionneuse__vignettes', v);
    var vPrec = $('.visionneuse__prec', v), vSuiv = $('.visionneuse__suiv', v);
    var pages = [], indexPage = 0, declencheur = null, alt = '';

    var afficher = function (i) {
      indexPage = (i + pages.length) % pages.length;
      vImg.src = pages[indexPage];
      vImg.alt = alt + (pages.length > 1 ? ' — page ' + (indexPage + 1) : '');
      vCompteur.textContent = pages.length > 1 ? 'Page ' + (indexPage + 1) + ' sur ' + pages.length : '';
      $$('button', vVign).forEach(function (b, n) { b.setAttribute('aria-current', n === indexPage ? 'true' : 'false'); });
      vPrec.hidden = vSuiv.hidden = pages.length < 2;
    };
    var ouvrir = function (el) {
      declencheur = el;
      pages = el.getAttribute('data-pages').split('|');
      alt = el.getAttribute('data-titre') || '';
      vTitre.innerHTML = '';
      vTitre.appendChild(document.createTextNode(alt));
      if (el.getAttribute('data-sous')) {
        var s = document.createElement('small');
        s.textContent = el.getAttribute('data-sous');
        vTitre.appendChild(s);
      }
      vVign.innerHTML = '';
      if (pages.length > 1) {
        pages.forEach(function (p, n) {
          var b = document.createElement('button');
          b.setAttribute('aria-label', 'Aller à la page ' + (n + 1));
          b.innerHTML = '<img src="' + p + '" alt="">';
          b.addEventListener('click', function () { afficher(n); });
          vVign.appendChild(b);
        });
      }
      afficher(0);
      v.hidden = false;
      document.body.style.overflow = 'hidden';
      requestAnimationFrame(function () { v.classList.add('est-ouverte'); });
      $('[data-fermer]', v).focus();
    };
    var fermer = function () {
      v.classList.remove('est-ouverte');
      document.body.style.overflow = '';
      setTimeout(function () { v.hidden = true; }, mouvementReduit ? 0 : 300);
      if (declencheur) declencheur.focus();
    };
    ouvrables.forEach(function (el) { el.addEventListener('click', function () { ouvrir(el); }); });
    $('[data-fermer]', v).addEventListener('click', fermer);
    vPrec.addEventListener('click', function () { afficher(indexPage - 1); });
    vSuiv.addEventListener('click', function () { afficher(indexPage + 1); });
    v.addEventListener('click', function (e) { if (e.target === v || e.target.classList.contains('visionneuse__scene')) fermer(); });
    document.addEventListener('keydown', function (e) {
      if (v.hidden) return;
      if (e.key === 'Escape') fermer();
      if (e.key === 'ArrowRight') afficher(indexPage + 1);
      if (e.key === 'ArrowLeft') afficher(indexPage - 1);
      if (e.key === 'Tab') {             // le focus reste dans la visionneuse
        var f = $$('button:not([hidden])', v);
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    });
    // Glisser du doigt pour changer de page
    var dx = null;
    v.addEventListener('touchstart', function (e) { dx = e.touches[0].clientX; }, { passive: true });
    v.addEventListener('touchend', function (e) {
      if (dx === null) return;
      var d = e.changedTouches[0].clientX - dx;
      if (Math.abs(d) > 50) afficher(indexPage + (d < 0 ? 1 : -1));
      dx = null;
    });
  }


  /* ---------- 19. Parrainage : simulateur de gains ----------
     Commissions (à modifier ici si elles changent) :
     DEX 500 FCFA par commande ; Visuo et Logia : montant mensuel selon le pack (bouton choisi). */
  var sim = $('[data-simulateur]');
  if (sim) {
    var SEUIL = 5000, DEX_PAR_COMMANDE = 500;
    var pack = { visuo: 1000, logia: 1000 };
    var majCurseur = function (c) { c.style.setProperty('--p', (c.value - c.min) / (c.max - c.min) * 100 + '%'); };
    var calculer = function () {
      var v = {};
      $$('[data-curseur]', sim).forEach(function (c) {
        v[c.getAttribute('data-curseur')] = parseInt(c.value, 10);
        $('[data-sortie="' + c.getAttribute('data-curseur') + '"]', sim).textContent = c.value;
        majCurseur(c);
      });
      var total = v.dex * DEX_PAR_COMMANDE + v.visuo * pack.visuo + v.logia * pack.logia;
      var filleuls = v.visuo + v.logia + (v.dex > 0 ? 1 : 0);
      $('[data-sim-total]', sim).textContent = formatPrix(total);
      $('[data-sim-an]', sim).textContent = formatPrix(total * 12);
      var nb = v.visuo + v.logia;
      $('[data-sim-filleuls]', sim).textContent = v.dex + ' commande' + (v.dex > 1 ? 's' : '') + ' · ' + nb + ' pack' + (nb > 1 ? 's' : '');
      $('[data-sim-barre]', sim).style.width = Math.min(100, total / SEUIL * 100) + '%';
      var s = $('[data-sim-seuil]', sim);
      s.textContent = total >= SEUIL ? '✔ Seuil de retrait atteint : versé en fin de mois' : 'Encore ' + formatPrix(SEUIL - total) + ' FCFA pour atteindre le retrait minimum (5 000 FCFA)';
      s.classList.toggle('ok', total >= SEUIL);
    };
    $$('[data-curseur]', sim).forEach(function (c) { c.addEventListener('input', calculer); });
    $$('.choix', sim).forEach(function (b) {
      b.addEventListener('click', function () {
        var g = b.getAttribute('data-groupe');
        pack[g] = parseInt(b.getAttribute('data-valeur'), 10);
        $$('.choix[data-groupe="' + g + '"]', sim).forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        calculer();
      });
    });
    calculer();
  }


  /* ---------- 14. Année du pied de page ---------- */
  $$('[data-annee]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

})();
