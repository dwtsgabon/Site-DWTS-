# Preuves de paiement DWTS : installation (15 minutes, une seule fois)

Le client paie **après avoir validé l'aperçu** de son travail, puis, sur `paiement.html`, il donne seulement
**son numéro WhatsApp + la capture OU le SMS de paiement collé**.
La preuve arrive dans un Google Sheets à ton nom (le montant et le TID sont lus automatiquement dans le SMS collé),
la capture est rangée dans Google Drive, et tu reçois un e-mail.
Le **code parrain** s'enregistre **une seule fois**, à l'inscription du client, dans la feuille **Clients** :
ensuite chaque paiement validé de ce client crédite son parrain tout seul (500 FCFA pour DEX),
et la feuille **Commissions** donne le total à verser par parrain et par mois.
Un client **sans code parrain** (inscription sans code, ou paiement d'un numéro non inscrit) reçoit automatiquement le **code maison `DWTS`** :
sa commission reste chez DWTS et s'affiche dans un tableau à part, **Commissions DWTS** (feuille **Commissions**, colonnes G à K),
pour voir combien de ventes viennent de ta propre pub, et combien des parrains.
À chaque statut **Validé**, une **facture PDF au logo de la branche** (DEX, Visuo ou Logia, avec le logo DWTS)
est créée dans Drive (dossier **DWTS - Factures**), son lien est noté dans la colonne **Facture**,
et elle est envoyée **directement par e-mail au client** (adresse donnée à l'inscription). Sans e-mail connu, elle te revient pour transfert sur WhatsApp.

Le même script fait aussi tourner l'**espace client**, sans serveur :
- `inscription.html` : le client s'inscrit une fois (nom, WhatsApp, e-mail, code de son parrain s'il en a un, code d'accès de 4 à 6 chiffres).
  Il reçoit **son propre code parrain** (PARRAIN-001…) et arrive **directement connecté** dans Mon espace. Lien d'invitation : `inscription.html?parrain=PARRAIN-024`.
- `espace.html` (« Mon espace », bouton **Connexion** du menu) : le client reste connecté **30 jours** sur son appareil (le navigateur propose d'enregistrer numéro + code).
  Onglets : tableau de bord, commandes et factures (PDF téléchargé directement, sans Google Drive), parrainage (lien d'invitation, filleuls, gains par mois),
  **retraits**, profil (photo, e-mail, changement du code d'accès). Après 5 mauvais codes, la connexion est bloquée une heure.
- `validation.html` : la page ouverte par les liens « Valider / Refuser » des e-mails (elle remplace l'ancienne page Google qui bloquait).

**E-mails** : tu ne reçois que les **preuves de paiement** (à valider) et les **demandes de retrait** (à verser).
Plus d'e-mail pour les inscriptions ni pour les devis (ils sont dans les feuilles **Clients** et **Devis**).
Seule exception : une facture d'un client **sans e-mail** te revient en pièce jointe, pour la transférer sur WhatsApp.

**Retraits** : le parrain touche « Demander mon retrait » le **dernier week-end du mois** (samedi et dimanche, heure de Libreville).
Le montant est son solde disponible, calculé par le script (gains − versements − retrait en cours) : il ne peut pas le modifier.
Solde sous 5 000 FCFA : la demande est **Annulé** (pas d'e-mail). Sinon **Approuvé** : tu reçois un e-mail, tu verses sous 48 h,
puis tu touches le lien **✅ Versé** : la ligne passe en **Versé** et le versement s'ajoute seul dans **Versements**.
Pour ouvrir les retraits tous les jours : `RETRAIT_DERNIER_WEEKEND: false` dans `CONFIG`.

Tout est gratuit (Google Sheets, Drive et Apps Script).

## 1. Créer le tableau

1. Sur Google Drive (compte `digitalwtservice@gmail.com` de préférence), créer un Google Sheets nommé **DWTS - Paiements**.
2. Menu **Extensions → Apps Script**.
3. Effacer le contenu, coller tout le fichier `apps-script.gs`, enregistrer (icône disquette).
4. En haut, choisir la fonction **installer**, cliquer **Exécuter**, puis accepter les autorisations
   (Google affiche « application non validée » : **Paramètres avancés → Accéder au projet**, c'est ton propre script).

`installer` crée aussi le déclencheur qui fabrique les factures : accepter les autorisations demandées (Drive, e-mail, accès aux logos).

Le tableau contient maintenant les feuilles **Paiements**, **Clients**, **Commissions**, **Versements**, **Devis** et **Retraits**,
et les dossiers Drive **DWTS - Preuves de paiement**, **DWTS - Factures**, **DWTS - Devis** et **DWTS - Photos clients** sont créés.

**Mise à jour du script (à chaque nouvelle version de `apps-script.gs`)** :
1. Coller le nouveau code à la place de l'ancien, enregistrer.
2. Exécuter **installer** (accepter les autorisations si Google les redemande).
3. **Déployer → Gérer les déploiements → crayon (Modifier) → Version : Nouvelle version → Déployer.**
   Sans cette étape, le site continue d'utiliser l'ancienne version (c'est souvent la cause d'un devis qui « ne part pas »).

## 2. Mettre le formulaire en ligne

1. Dans Apps Script : **Déployer → Nouveau déploiement**, type **Application Web**.
2. Exécuter en tant que : **Moi**. Qui a accès : **Tout le monde**.
3. Cliquer **Déployer**, copier l'adresse qui finit par `/exec`.
4. Dans `assets/js/config-espace.js`, remplacer `window.DWTS_URL_SCRIPT = '';` par `window.DWTS_URL_SCRIPT = 'https://script.google.com/macros/s/…/exec';`
   (une seule adresse pour les pages Paiement, Inscription et Mon espace).

Tant que l'adresse est vide : Paiement et Inscription ouvrent WhatsApp avec le message déjà écrit ; Mon espace affiche « bientôt disponible ».

## 3. Utilisation au quotidien

**Inscriptions** : elles arrivent seules dans **Clients** (sans e-mail). Un client qui s'inscrit par WhatsApp :
ajoute sa ligne toi-même (numéro, nom, code de son parrain, date, son code parrain, un code d'accès à 4 chiffres).
Parrains déjà existants avant le site (ex. PARRAIN-024) : les ajouter dans **Clients** avec leur code, puis, dans Apps Script,
**Paramètres du projet → Propriétés du script** : `compteur_parrain` = le plus grand numéro déjà donné (ex. 24), pour ne pas redonner un code existant.
Code d'accès oublié : il est dans la colonne **Code d'accès** de **Clients**.

**Versements aux parrains** : chaque versement fait, une ligne dans **Versements** (code parrain, date, montant). « Mon espace » affiche alors le solde à jour.

**À chaque paiement :**

1. Un e-mail « nouvelle preuve de paiement » arrive, avec deux liens : **✅ Valider** et **❌ Refuser**.
   Le lien ouvre la page **validation.html** du site (pas Google Drive) : après avoir comparé avec ton SMS de réception,
   touche le bouton : le statut, la commission et la facture se font tout seuls. Pas besoin d'ouvrir le tableau.
2. Ouvrir la capture, retrouver **le même TID et le même montant** dans tes SMS de réception.
   Dépôt chez un agent : comparer montant, heure et code agent (`A7793`…).
   Une **Alerte** « TID déjà envoyé » signale une capture réutilisée.
3. Si la preuve est une capture, compléter **Montant** et **TID** ; si ce n'est pas du DEX, changer **Service**.
4. Facultatif : écrire la **Désignation** de la facture (ex. « Exposé palier 2 · Mode 1 ») ; sinon « Prestation DEX ».
5. Passer la colonne **Statut** à **Validé** (ou **Refusé**) : la facture PDF arrive par e-mail.
   Envoyer au client le fichier final et la facture sur WhatsApp.
6. Fin du mois : les parrains demandent eux-mêmes leur retrait (voir **Retraits** plus haut).
   La feuille **Commissions** montre les gains par mois, le **solde par parrain** (gagné, versé, reste à verser en rouge dès 5 000 FCFA)
   et, à droite, les **Commissions DWTS** : ce que DWTS garde, rien à verser.

Visuo et Logia : la commission du parrain dépend du pack mensuel ; la saisir à la main dans la colonne **Commission**.

## Tableau de bord

`installer` crée aussi l'onglet **Tableau de bord** (en premier) : chiffre d'affaires, CA du mois, paiements validés et à vérifier,
panier moyen, clients et nouveaux clients, parrains actifs, commissions à verser et commissions DWTS, devis ; évolution mois par mois,
répartition par branche, statut des paiements, top 5 des parrains, avec graphiques. Tout se met à jour seul.
Les feuilles de données ont des en-têtes marine, des lignes alternées et des statuts en couleur.
Pour reconstruire le tableau de bord après une mise à jour du script : exécuter à nouveau `installer`.

## Devis en ligne

`devis.html` : le client choisit sa branche (Visuo ou Logia), ses prestations et formules, laisse nom, WhatsApp et e-mail.
Le script recalcule le total avec ses propres prix (liste `CATALOGUE_DEVIS`), crée le devis PDF au logo de la branche (dossier Drive **DWTS - Devis**),
l'envoie au client par e-mail et ajoute une ligne dans la feuille **Devis** (sans e-mail pour toi). Aucune action de ta part.
En cas d'erreur, la page Devis affiche maintenant le message exact au lieu de « envoyé ».
Les prix sont dans `assets/js/catalogue-devis.js` (page) et `CATALOGUE_DEVIS` (script) : les modifier aux deux endroits.

## Modifier un réglage

En haut de `apps-script.gs`, bloc `CONFIG` : e-mail d'alerte, nom du dossier, montant de la commission DEX, seuil de versement.
Après une modification du script : **Déployer → Gérer les déploiements → Modifier → Nouvelle version** (l'adresse `/exec` ne change pas).

Les logos des factures sont lus sur le dépôt GitHub (branche `main`) : ils apparaissent une fois cette version du site publiée.
Pour des devis complets ou une facture à plusieurs lignes, utiliser le classeur `outils-factures/DWTS_Devis_Factures.xlsx`.
