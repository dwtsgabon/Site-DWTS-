# Marketing DWTS : fabrication des publications

Ce dossier contient les outils qui fabriquent les publications de DWTS (affiches, reels avec voix off et musique) et les médias publiés.

## Ligne éditoriale

- Branche locomotive : **DEX** (environ 70 % des posts). **Visuo** : 1 post par semaine. **Logia** : 1 post toutes les deux semaines.
- Reels = tutoriels courts utiles (Word, page de garde, CV, IA pour étudiants), puis appel à l'action : « DEX le fait pour toi. Écris-nous sur WhatsApp ».
- Pas de publicité pour le bot de trading Sentinel-Grid.
- Contact : WhatsApp 062 67 14 45 (`https://wa.me/24162671445`).
- Voix off officielle : ElevenLabs **Paul K** (`voice_id` `ecxPjiGTvAfpGEams6ec`), modèle `eleven_v4`, **1 seule prise** par vidéo.
- Uniquement de vraies réalisations (`assets/img/dex`, `assets/img/visuo`, `assets/img/logia`), jamais d'images inventées.

## Semaine type

| Jour | Facebook / TikTok / YouTube | Chaîne WhatsApp (publiée à la main) |
|---|---|---|
| Lundi | Post texte DEX | Astuce du jour |
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
Marque Metricool : `blogId` 7424675, fuseau `Africa/Libreville`. Réseaux connectés : Facebook, TikTok, YouTube.
