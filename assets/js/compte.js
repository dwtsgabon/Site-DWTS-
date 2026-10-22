// Outils communs des pages Inscription, Mon espace et Validation :
// appel du script Google et session « rester connecté » (jeton gardé dans ce navigateur).
(function () {
  var CLE = 'dwts_session';

  // Appel du script : POST en texte simple (pas de pré-vérification CORS), réponse JSON
  window.dwtsApi = function (action, donnees) {
    var url = window.DWTS_URL_SCRIPT || '';
    if (!url) return Promise.reject(new Error('script'));
    var corps = Object.assign({ action: action }, donnees || {});
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(corps) })
      .then(function (r) { return r.json(); });
  };

  window.dwtsSession = {
    lire: function () {
      try {
        var s = JSON.parse(localStorage.getItem(CLE) || 'null');
        if (!s || !s.jeton) return null;
        var expiration = Number(String(s.jeton).split('.')[1]);
        if (!(expiration > Date.now())) { localStorage.removeItem(CLE); return null; }
        return s;
      } catch (e) { return null; }
    },
    ecrire: function (jeton, nom) {
      try { localStorage.setItem(CLE, JSON.stringify({ jeton: jeton, nom: nom || '' })); } catch (e) { /* navigation privée */ }
    },
    effacer: function () {
      try { localStorage.removeItem(CLE); } catch (e) { /* rien */ }
    }
  };

  // Propose au navigateur d'enregistrer numéro + code d'accès (Chrome, Edge, Android).
  // Les autres navigateurs le proposent d'eux-mêmes grâce aux champs « username » et « password ».
  window.dwtsEnregistrerIdentifiants = function (numero, code, nom) {
    try {
      if (window.PasswordCredential && navigator.credentials) {
        var cred = new window.PasswordCredential({ id: numero, password: code, name: nom || numero });
        return Promise.race([navigator.credentials.store(cred), new Promise(function (r) { setTimeout(r, 1500); })]).catch(function () {});
      }
    } catch (e) { /* non pris en charge */ }
    return Promise.resolve();
  };

  window.dwtsEchapper = function (t) {
    return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  window.dwtsXaf = function (n) { return Number(n || 0).toLocaleString('fr-FR') + ' XAF'; };
})();
