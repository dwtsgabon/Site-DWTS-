# Marketing DWTS : fabrication des publications

Ce dossier contient les outils qui fabriquent les publications de DWTS (affiches, reels avec voix off et musique) et les médias publiés.

## Ligne éditoriale

- Branche locomotive : **DEX** (environ 70 % des posts). **Visuo** : 1 post par semaine. **Logia** : 1 post toutes les deux semaines.
- Reels = tutoriels courts utiles (Word, page de garde, CV, IA pour étudiants), puis appel à l'action.
- **Un seul bouton partout : « Commander sur WhatsApp »** (affiches, fin des reels, légendes : `📲 Commander sur WhatsApp : wa.me/24162671445`).
- **Toujours un prix visible** (vrais prix de `tarifs.html`) : CV dès 1 500 XAF, exposé dès 2 500 XAF, affiche dès 2 500 XAF, logo dès 6 500 XAF.
- **Preuve honnête** : « ✅ Aperçu avant paiement » (vrai pour DEX et Visuo). Jamais de faux avis, fausse urgence ou fausse rareté ; ajouter les vrais avis clients quand il y en aura.
- Méthode de référence : skill `campagne-pub-ia` (test des 3 secondes, un seul message, bénéfice avant caractéristique).
- Pas de publicité pour le bot de trading Sentinel-Grid.
- **Jamais de post texte seul** : chaque publication a une image (affiche) ou une vidéo. Facebook limite la portée des posts sans visuel.
- Contact : WhatsApp 062 67 14 45 (`https://wa.me/24162671445`).
- Voix off officielle : ElevenLabs **Paul K** (`voice_id` `ecxPjiGTvAfpGEams6ec`), modèle `eleven_v4`, **1 seule prise** par vidéo.
- Uniquement de vraies réalisations (`assets/img/dex`, `assets/img/visuo`, `assets/img/logia`), jamais d'images inventées.

## Règles de conception (compétence `meta-ads-dwts`, section 10)

- **Reels 9:16 : zones de sécurité.** Rien d'important dans les **14 % du haut** (y < 270) ni les **35 % du bas** (y > 1248) : l'interface Facebook (titre, légende, boutons) les recouvre. Bouton, prix et texte vivent entre y = 270 et y = 1248. `base.css` applique déjà ces positions.
- **Pas de logo pendant les 3 premières secondes** d'un reel : on commence directement par l'accroche. Le logo apparaît sur l'écran final.
- **Accroche : 7 mots maximum**, très grosse, une seule idée par écran.
- **Affiches 4:5 : au moins 30 % d'espace vide**, un seul élément principal. Titre + élément principal + prix + bouton ; éviter le paragraphe de sous-titre et les listes longues.
- Le texte à l'écran doit suffire à comprendre la vidéo sans le son (85 % des vidéos sont vues sans le son).
- Vérifier chaque rendu avec un cadre rouge sur les zones interdites avant de l'envoyer.

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
