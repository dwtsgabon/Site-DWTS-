# Preuves de paiement DWTS : installation (15 minutes, une seule fois)

Le client paie **après avoir validé l'aperçu** de son travail, puis, sur `paiement.html`, il donne seulement
**son numéro WhatsApp + la capture OU le SMS de paiement collé**.
La preuve arrive dans un Google Sheets à ton nom (le montant et le TID sont lus automatiquement dans le SMS collé),
la capture est rangée dans Google Drive, et tu reçois un e-mail.
Le **code parrain** s'enregistre **une seule fois**, à l'inscription du client, dans la feuille **Clients** :
ensuite chaque paiement validé de ce client crédite son parrain tout seul (500 FCFA pour DEX),
et la feuille **Commissions** donne le total à verser par parrain et par mois.

Tout est gratuit (Google Sheets, Drive et Apps Script).

## 1. Créer le tableau

1. Sur Google Drive (compte `digitalwtservice@gmail.com` de préférence), créer un Google Sheets nommé **DWTS - Paiements**.
2. Menu **Extensions → Apps Script**.
3. Effacer le contenu, coller tout le fichier `apps-script.gs`, enregistrer (icône disquette).
4. En haut, choisir la fonction **installer**, cliquer **Exécuter**, puis accepter les autorisations
   (Google affiche « application non validée » : **Paramètres avancés → Accéder au projet**, c'est ton propre script).

Le tableau contient maintenant les feuilles **Paiements**, **Clients** et **Commissions**, et un dossier Drive **DWTS - Preuves de paiement** est créé.

## 2. Mettre le formulaire en ligne

1. Dans Apps Script : **Déployer → Nouveau déploiement**, type **Application Web**.
2. Exécuter en tant que : **Moi**. Qui a accès : **Tout le monde**.
3. Cliquer **Déployer**, copier l'adresse qui finit par `/exec`.
4. Dans `paiement.html`, remplacer `const URL_SCRIPT = '';` par `const URL_SCRIPT = 'https://script.google.com/macros/s/…/exec';`.

Tant que `URL_SCRIPT` est vide, le formulaire ouvre WhatsApp avec le message déjà écrit (le client joint la capture lui-même).

## 3. Utilisation au quotidien

**Inscription d'un client parrainé (une seule fois)** : quand un nouveau client donne un code parrain à sa première commande,
ajoute une ligne dans **Clients** : son numéro WhatsApp, son nom, le code parrain, la date. C'est tout : ses paiements suivants
seront reliés à son parrain automatiquement.

**À chaque paiement :**

1. Un e-mail « nouvelle preuve de paiement » arrive.
2. Ouvrir la capture, retrouver **le même TID et le même montant** dans tes SMS de réception.
   Dépôt chez un agent : comparer montant, heure et code agent (`A7793`…).
   Une **Alerte** « TID déjà envoyé » signale une capture réutilisée.
3. Si la preuve est une capture, compléter **Montant** et **TID** ; si ce n'est pas du DEX, changer **Service**.
4. Passer la colonne **Statut** à **Validé** (ou **Refusé**), puis envoyer le fichier final au client sur WhatsApp.
5. Fin du mois : feuille **Commissions**, verser à chaque parrain dont le total atteint 5 000 FCFA.

Visuo et Logia : la commission du parrain dépend du pack mensuel ; la saisir à la main dans la colonne **Commission**.

## Modifier un réglage

En haut de `apps-script.gs`, bloc `CONFIG` : e-mail d'alerte, nom du dossier, montant de la commission DEX, seuil de versement.
Après une modification du script : **Déployer → Gérer les déploiements → Modifier → Nouvelle version** (l'adresse `/exec` ne change pas).
