# Marketing DWTS : fabrication des publications

Ce dossier contient les outils qui fabriquent les publications de DWTS (affiches, reels avec voix off et musique) et les médias publiés.

## Ligne éditoriale

- Branche locomotive : **DEX** (environ 70 % des posts). **Visuo** : 1 post par semaine. **Logia** : 1 post toutes les deux semaines.
- Reels = tutoriels courts utiles (Word, page de garde, CV, IA pour étudiants), puis appel à l'action.
- **Un seul bouton partout : « Commander sur WhatsApp »** (affiches, fin des reels, légendes : `📲 Commander sur WhatsApp : wa.me/24162671445`).
- **Toujours un prix visible** (vrais prix de `tarifs.html`) : CV dès 1 500 XAF, exposé dès 2 500 XAF, affiche dès 2 500 XAF, logo dès 6 500 XAF.
- **Réalisations Logia** : ne pas dire qu'un outil est « le bot de DEX » ou « celui que nous utilisons pour DEX » (décision d'Elie). Dire « un bot que nous avons automatisé », « une de nos réalisations ».
- **Preuve honnête** : « ✅ Aperçu avant paiement » (vrai pour DEX et Visuo). Jamais de faux avis, fausse urgence ou fausse rareté ; ajouter les vrais avis clients quand il y en aura.
- Méthode de référence : skill `campagne-pub-ia` (test des 3 secondes, un seul message, bénéfice avant caractéristique).
- Pas de publicité pour le bot de trading Sentinel-Grid.
- **Jamais de post texte seul** : chaque publication a une image (affiche) ou une vidéo. Facebook limite la portée des posts sans visuel.
- Contact : WhatsApp 062 67 14 45 (`https://wa.me/24162671445`).
- Voix off officielle : ElevenLabs **Paul K** (`voice_id` `ecxPjiGTvAfpGEams6ec`), modèle `eleven_v4`, **1 seule prise** par vidéo.
- **Modèles d'affiches de référence** (inspirés des anciennes affiches d'Elie, refaits aux couleurs du nouveau logo) : `post-dwts-1` (fondateur + 3 branches), `post-dex-3` (problème → solution, vraies pages d'exposés), `post-visuo-2` (affiche d'événement, vraies affiches dans un téléphone). Photo détourée d'Elie : `marketing/photos/elie-detoure.png`.
- Ne plus proposer les abonnements Netflix et IPTV : hors des trois branches, et risque juridique (revente de comptes, IPTV sans droits).
- **Le texte et l'image doivent parler de la même chose.** Pour une offre aux entreprises, prendre les modèles par secteur du site (`assets/img/visuo/` : restaurant Saveurs du Cap, boutique Okoumé, salle de sport Cap Fit, salon Nappy Queen, avec leur logo et leur affiche) ; pour une offre « événement », les affiches d'événements (culte, camp, conférence). Vérifier chaque rendu en relisant texte et image ensemble.
- Uniquement de vraies réalisations (`assets/img/dex`, `assets/img/visuo`, `assets/img/logia`), jamais d'images inventées.

## Règles de conception (compétence `meta-ads-dwts`, section 10)

- **Reels 9:16 : zones de sécurité.** Rien d'important dans les **14 % du haut** (y < 270) ni les **35 % du bas** (y > 1248) : l'interface Facebook (titre, légende, boutons) les recouvre. Bouton, prix et texte vivent entre y = 270 et y = 1248. `base.css` applique déjà ces positions.
- **Pas de logo pendant les 3 premières secondes** d'un reel : on commence directement par l'accroche. Le logo apparaît sur l'écran final.
- **Accroche : 7 mots maximum**, très grosse, une seule idée par écran.
- **Affiches 4:5 : au moins 30 % d'espace vide**, un seul élément principal. Titre + élément principal + prix + bouton ; éviter le paragraphe de sous-titre et les listes longues.
- Le texte à l'écran doit suffire à comprendre la vidéo sans le son (85 % des vidéos sont vues sans le son).
- Vérifier chaque rendu avec un cadre rouge sur les zones interdites avant de l'envoyer.

## Style « pro » (à utiliser par défaut depuis la semaine 45)

Décision d'Elie : les anciennes affiches (fond sombre dégradé, cartes en verre, pastilles, émojis) font « IA ». Nouveau style, calqué sur les agences concurrentes et amélioré :
- titre en **capitales très grasses** (Montserrat 900), prix géants en **Anton** ; polices dans `marketing/polices/` ;
- **une seule image forte et réelle** : capture du site dans un ordinateur, photo d'Elie détourée, vraies captures des logiciels ;
- **bande d'infos en bas** (WhatsApp, site, Facebook, Port-Gentil) avec icônes au trait, pas d'émojis ;
- fonds unis (bleu vif, bleu nuit ou clair), pas d'effet verre.
Autres inspirations reprises : Bloc Communication (grandes formes de couleur + téléphone, `pro-visuo-facebook`), Ghostroar (question au public en haut, mot géant, 3 bénéfices à icônes rondes, `pro-logia-bot`).
Modèles : `pro-dwts-site` (site en ligne), `pro-logia-gestion` (offre + prix + fondateur), `pro-logia-catalogue` (catalogue de logiciels). Styles communs : `_pro.css`. Rendu : servir le dépôt (`npx http-server -p 8774`) puis capturer `/marketing/modeles/<modèle>.html` en 1080×1350.

## Validation avant programmation (règle d'Elie, 27 oct. 2026)

Chaque nouvelle publication est **montrée à Elie (visuel + légende + date et heure) avant d'être programmée**. On ne programme qu'après son accord.

## Publications d'ambiance (fêtes, journées mondiales, humour, actualité)

Environ 25 % des publications. Dates suivies dans l'agenda Google d'Elie (rappels « 📣 DWTS ») et dans le calendrier « Jours fériés au Gabon ».
- Jours de deuil ou de recueillement (Toussaint…) : message sobre, **aucune vente, aucun contact, aucun prix**, logo discret.
- Fêtes : une seule publication, sans « commandez ».
- Humour : vise une situation, jamais une personne ; illustrations faites par nous, pas de mèmes copiés.
- Foot et actualité : jamais de photo de vrai joueur ni de logo de club ; personnages dessinés aux couleurs, ton neutre envers les deux camps.
- Jamais de politique, de religion clivante ni de drame.
Modèle : `pro-ambiance-toussaint`.

## Varier les visuels (règle d'Elie)

Chaque publication a **sa propre mise en page**, choisie selon ce qu'elle raconte. Jamais deux publications d'affilée avec la même mise en page, et jamais les mêmes images deux fois en moins de 4 semaines. Avant de créer, relire le journal ci-dessous.

Mises en page disponibles (`marketing/modeles/`) :
| Mise en page | Modèle | Pour |
|---|---|---|
| Ordinateur avec capture du site | `pro-dwts-site` | annonce, site, outil web |
| Fondateur + cartes des branches | `pro-dwts-presentation` | présentation, confiance |
| Prix géant + fondateur + capture | `pro-logia-gestion` | offre avec prix fort |
| Catalogue de produits en grille | `pro-logia-catalogue` | plusieurs offres d'une branche |
| Éventail de 3 documents + prix | `pro-dex-expose` | résultat final |
| Bande de pages numérotées | `pro-dex-pages` | montrer un travail étape par étape |
| Mur d'affiches (mosaïque) | `pro-visuo-mur` | portfolio, quantité de réalisations |
| Formes de couleur + téléphone | `pro-visuo-facebook` | réseaux sociaux, visibilité |
| Question + mot géant + 3 bénéfices | `pro-logia-bot` | problème du client, service |
| Écran d'ordinateur + 3 cartes | `pro-logia-pointage` | logiciel, réalisation sur devis |
| Documents annotés (bulles numérotées) | `pro-dex-cv` | montrer ce qui fait la différence |
| Conseils numérotés + exemple | `pro-dex-conseils` | contenu utile, tutoriel |
| Grille de logos | `pro-visuo-logos` | identités visuelles |
| Chiffre clé géant + 3 cartes | `pro-dwts-parrainage` | un montant, une statistique vraie |
Si aucune ne colle, **en créer une nouvelle** (autres idées : avant/après, témoignage client, tutoriel en étapes, chiffre clé, comparatif).

Images encore jamais publiées : DEX `expose-anglais.jpg`, pages `expose-meyene-2..4.jpg` ; Visuo `action-grace`, `voeux-noel`, `sortie-ta-presence`, `invitation-anniversaire` (enfant flouté).

### Journal des visuels publiés
| Date | Branche | Mise en page | Images |
|---|---|---|---|
| 26/10 | DWTS | ordinateur + site | capture accueil |
| 27/10 | DWTS | fondateur + branches | photo Elie, 3 logos |
| 28/10 | DEX | bande de pages | exposé Nzebi (garde, sommaire, page 5) |
| 30/10 | Visuo | mur d'affiches | culte traversée, veillée, salon adoration, conférence art, Afro Vibes |
| 31/10 | Logia | prix géant + fondateur | photo Elie, capture gestion |
| 03/11 | Visuo | formes + téléphone | Saveurs du Cap (logo + affiche restaurant) |
| 05/11 | Logia | question + mot géant | capture d'un bot réalisé par Logia |
| 07/11 | Logia | écran + 3 cartes | capture pointage |
| 09/11 | DEX | documents annotés | cv.jpg, lettre.jpg |
| 11/11 | DEX | conseils numérotés | expose-classicisme.jpg |
| 13/11 | Visuo | grille de logos | logos Okoumé, Cap Fit, Glow by Mira, Nappy Queen, Délices de Maman |
| 14/11 | DWTS | chiffre clé | aucune image (montants du parrainage) |

## Légendes (description sous l'affiche)

La légende **ne répète pas** le texte de l'affiche : l'image donne le titre et le prix, la légende raconte le reste. Structure observée chez les concurrents qui écrivent bien (Akxa, ONEG, PubPlanner, Outsourcia) :
1. **Accroche** d'une phrase, différente du titre de l'affiche (un problème vécu, une situation).
2. **Contexte** en 2-3 phrases : pourquoi c'est un problème, ce que ça coûte au client.
3. **Notre réponse** expliquée simplement (comment ça se passe, pas la liste de l'affiche).
4. **Question** pour faire commenter.
5. **Bloc contact** : 🌐 site, 📲 WhatsApp, 📍 Port-Gentil, Gabon.
6. **3 hashtags** maximum.

## Veille concurrentielle (à refaire à chaque publication de concurrent envoyée par Elie)

**Bibliothèque des modèles d'anniversaire : `marketing/modeles/anniversaire/`** (modèles à paramètres : nom, date, photo, couleurs).

**Bibliothèque des concurrents : `marketing/veille.md`** (une fiche par publication reçue, à lire avant chaque nouvelle publication et à compléter à chaque capture envoyée par Elie).

1. Noter ce que le concurrent **vend** et si DWTS le propose déjà (tarifs.html). Sinon, le signaler à Elie sans l'inventer.
2. Faire la version DWTS **meilleure** : vraie capture ou vraie réalisation à la place des photos de banque d'images, un vrai prix visible, un seul bouton WhatsApp.
3. Ne pas copier leurs défauts : statistiques sans source (« 80 % des PME… »), économies non prouvées, coordonnées en vrac, plusieurs boutons.
4. Ce qui marche chez eux, à reprendre : outil concret montré à l'écran, vraie capture d'outil (75 réactions, 22 commentaires, 15 partages ; les affiches à photo de banque d'images font 2 à 7 réactions), légende longue qui explique un problème puis pose une question.
5. Ne jamais annoncer « gratuit » (décision d'Elie) : le concurrent au logiciel de pointage « gratuit » menait à une version payante. Les outils montrés sont des **exemples de réalisation**, vendus sur devis : pointage du personnel (`marketing/realisations-logia/`, affiche `post-logia-4`).
6. Modèles déjà faits en réponse : `post-logia-2` (logiciel de gestion), `post-logia-3` (bot WhatsApp), `post-visuo-3` (gestion de page Facebook). Styles communs : `_commun-concurrence.css`.

## Semaine type

| Jour | Facebook | Chaîne WhatsApp (publiée à la main) |
|---|---|---|
| Lundi | Affiche DEX (accroche courte) | Astuce du jour |
| Mardi | Reel tuto 1 | Avant / après |
| Mercredi | Affiche DEX | Offre DEX |
| Jeudi | Reel tuto 2 | Astuce |
| Vendredi | Affiche Visuo (ou Logia une semaine sur deux) | Réalisation Visuo |
| Samedi | Reel tuto 3 | Question à la communauté |
| Dimanche | — | Résumé de la semaine |

## Fabriquer un reel

Les modèles HTML (`modeles/`) font 1080×1920 et sont animés en CSS. Les scènes ont des débuts fixés (`--s`) et des durées fixées (`--d`).

1. Générer la voix off (Paul K), puis repérer les pauses :
   `ffmpeg -i voix.mp3 -af silencedetect=noise=-35dB:d=0.2 -f null -`
2. Copier un modèle et caler chaque scène sur le début de sa phrase.
3. Dans un dossier de travail où `assets` est un lien vers `assets/` du site, et qui contient `base.css` et les outils :
   `bash make.sh <nom> <durée_s> <voix.mp3> 0`
   Le script rend les images avec Playwright, encode la vidéo, compose le beat (`beat.py`, création originale libre de droits) et le mixe sous la voix, avec baisse automatique quand la voix parle.
4. Résultat : `<nom>-final.mp4`.

Pour une affiche (1080×1350) : `node render.js modele.html sortie.png 1080 1350`.

## Publication

Les médias vont dans `media/<année>-s<semaine>/`. Metricool les lit à l'adresse
`https://raw.githubusercontent.com/mbadingaryan-sketch/Site-DWTS-/<branche>/media/...`.
Marque Metricool : `blogId` 7424675, fuseau `Africa/Libreville`. **Publier uniquement sur Facebook** (décision d'Elie) ; TikTok et YouTube restent connectés mais ne reçoivent rien. La chaîne WhatsApp est publiée à la main.
