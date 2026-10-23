---
name: mise-a-jour-dwts
description: Publier une modification du site DWTS (GitHub Pages) et mettre à jour le script Google Apps Script (espace client, paiements, devis, retraits). À utiliser dès qu'on change un fichier du site, outils-paiement/apps-script.gs, ou l'adresse du script.
---

# Mise à jour du site et du script DWTS

Elie (propriétaire) débute : étapes numérotées, en français simple, une capture d'écran demandée en cas de blocage.

## 1. Publier le site (Claude le fait seul, sans demander)
1. Repartir de `main` : `git fetch origin main && git checkout -B <branche> origin/main`.
2. Modifier, tester (Playwright + script simulé si besoin), commit, push.
3. Créer la demande de fusion (outil GitHub) puis la **fusionner soi-même** (`merge_pull_request`).
   Ne pas envoyer Elie chercher les boutons « Ready for review » / « Merge » : il l'a demandé.
4. Site en ligne : https://dwtsgabon.github.io/Site-DWTS-/ (mis à jour en 1 à 2 minutes).

## 2. Mettre à jour le script Google (Elie le fait, Claude guide)
Seulement si `outils-paiement/apps-script.gs` a changé. Donner le lien **après la fusion** :
https://github.com/dwtsgabon/Site-DWTS-/blob/main/outils-paiement/apps-script.gs
1. Icône « Copy raw file » (deux carrés) → dans Apps Script (ouvert depuis le Google Sheets, Extensions → Apps Script) : Ctrl + A, Suppr, Ctrl + V, enregistrer.
2. Services : seul **Drive API** (v3, identifiant « Drive ») doit être ajouté (lecture des captures).
3. Exécuter **installer**, accepter les autorisations. « Erreur inconnue » : recharger la page, ou fenêtre privée avec le seul compte digitalwtservice@gmail.com.
4. **Déployer → Gérer les déploiements → crayon → Nouvelle version → Déployer** (même adresse).
   Éviter « Nouveau déploiement » : l'adresse change.
5. Vérifier : Ctrl + F dans l'éditeur sur une fonction récente du script (ex. `imageCapture_`).

## 3. Si Elie envoie une nouvelle adresse `/exec`
1. La remplacer dans `assets/js/config-espace.js` (deux lignes : commentaire + `window.DWTS_URL_SCRIPT`).
2. Publier (étape 1, fusion directe).
3. Test sans compte Google connecté (fenêtre privée vierge ou téléphone) :
   `<adresse>/exec?action=espace&jeton=test` → doit répondre « Votre session a expiré. Reconnectez-vous. »
   « Numéro WhatsApp invalide. » = ancien code ; « Impossible d'ouvrir le fichier » avec `/u/3/` = plusieurs comptes connectés.
4. Les liens des anciens e-mails de validation deviennent invalides si le projet change : refaire un essai avec une nouvelle preuve.

## Pièges déjà rencontrés
- Plusieurs projets Apps Script (« Projet sans titre ») : le bon est celui ouvert depuis le Google Sheets et qui contient la feuille Retraits.
- Page de validation sans champs Montant/TID et capture en simple lien = le déploiement utilisé fait tourner l'ancien code.
- L'environnement de Claude ne peut pas joindre script.google.com : les tests réels sont faits par Elie.
