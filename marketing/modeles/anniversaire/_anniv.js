// Remplit le modèle avec les paramètres de l'adresse : ?prenom=…&nom=…&jour=…&mois=…&annee=…&jsem=…&role=…&message=…&photo=…&theme=…
// Sans paramètre, le modèle affiche l'anniversaire d'Elie (30 octobre).
(function(){
var P=new URLSearchParams(location.search);
var D={prenom:'Elie Ryan',nom:'Mbwendi Mbadinga',jour:'30',mois:'Octobre',annee:'2026',jsem:'Vendredi',
 role:'Fondateur de DWTS',message:"Que cette nouvelle année t'apporte santé, succès et sagesse.",
 photo:'/marketing/photos/elie-detoure.png',pourcent:'89',ligne1:'Mon'};
var T={ // thèmes : fond 1, fond 2, accent, accent 2, texte
 bleu:['#061021','#123a78','#2F86FF','#22D3EE','#ffffff'],
 or:['#140b05','#4a2a10','#E2A93B','#F7D98B','#ffffff'],
 rouge:['#7d070d','#c4121b','#FFD3A1','#ffffff','#ffffff'],
 emeraude:['#03231b','#0b5a44','#9fe3c4','#ffffff','#ffffff'],
 violet:['#1b0b36','#5b2aa6','#E9C46A','#c9b6ff','#ffffff'],
 gris:['#eef0f4','#c7ccd5','#FFC21A','#e3262e','#0b0b0f']};
var V=function(k){return P.get(k)||D[k]};
var nt=T[P.get('theme')]?P.get('theme'):(document.body.dataset.theme||'bleu'),t=T[nt],r=document.documentElement.style;
['--f1','--f2','--acc','--acc2','--texte'].forEach(function(n,i){r.setProperty(n,t[i])});
document.querySelectorAll('[data-v]').forEach(function(e){e.textContent=V(e.dataset.v)});
document.querySelectorAll('img[data-photo]').forEach(function(e){e.src=V('photo')});
document.querySelectorAll('[data-pourcent]').forEach(function(e){e.style.width=V('pourcent')+'%'});
document.querySelectorAll('img.logo').forEach(function(e){e.src=nt==='gris'?'/assets/img/logo-dwts.png':'/assets/img/logo-dwts-clair.png'});
})();
