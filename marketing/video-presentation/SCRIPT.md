# Vidéo de présentation DWTS : script validé

Format vertical 9:16 (1080 × 1920), environ 68 s. Voix : « Elie Ryan » (voir `.claude/skills/video-dwts/SKILL.md`).

## État (26 oct. 2026)
- v3.1 (27 oct.) : voix du parrainage (53,9 s à 82,6 s) remontée d'environ 3,5 dB, avec un peu de présence (2,5 kHz), à la demande d'Elie.
- Vidéo v3 validée par Elie : nouveau logo DWTS (grille) dans les scènes 1, 2, 8 et fin, orange remplacé par le bleu du logo (#2F86FF). Script, voix, musique et minutage inchangés (son repris de la v2).
- `video.html` pointe maintenant directement vers les images du site (`assets/img/visuo/`) : rendu image par image avec `render(t)` à 30 i/s, puis ffmpeg.

## État (23 oct. 2026)
- Vidéo montée (v2) : `DWTS-presentation.mp4` (1080 × 1920, 30 i/s, 87 s, son -14 LUFS). Scène parrainage refaite (code exemple PARRAIN-001, 500 F par commande DEX, 1 000 à 5 000 F/mois Visuo-Logia, exemple 6 000 F).
- Sources : `video.html` (animation, `render(t)`), `mixage2.py` (voix nettoyée, musique baissée automatiquement sous la voix, effets égalisés), flow ElevenLabs « DWTS - Vidéo de présentation ».
- Voix : prise 2. Pause de 2,5 s ajoutée avant la scène 7 pour laisser lire les prix.
- Musique : ElevenLabs Music v2.5, instrumentale (aucune parole détectée).
- Photo de l'affiche Cap Fit : générée par IA (ElevenLabs, Seedream), sans filigrane.

## Montage voulu par Elie
- Moderne, avec des effets sonores, et des transitions calées sur la voix off et la musique.
- Scène 1 : une question à la fois, au centre. Elle sort, puis la suivante entre au rythme de la voix.
- Scène 4 : les logos arrivent un par un avec un « pop », puis les affiches défilent comme un fil Instagram.
- Scène 9 : les montants comptent de 0 jusqu'au chiffre.

## Voix off
1. « Votre exposé est pour demain ? Votre commerce manque de clients ? Vous répondez aux mêmes messages toute la journée ? »
2. « Chez DWTS, nos équipes conçoivent la solution à votre besoin. »
3. « Vous envoyez votre contenu, notre équipe DEX vous rend un document corrigé, bien présenté et prêt à imprimer. Un exposé ? Dès 2 500 F, et livré rapidement, là où d'autres vous font attendre. »
4. « Pour vous faire connaître, notre équipe Visuo crée votre logo, vos affiches, vos vidéos et votre site web, et fait vivre vos réseaux sociaux. »
5. « Pour gagner du temps, notre équipe Logia installe un bot WhatsApp qui répond à vos clients jour et nuit, et des outils qui travaillent à votre place. »
6. « Et quel que soit votre budget, il y a une formule pour vous. »
7. « Vous nous écrivez, vous commandez, vous découvrez l'aperçu, et vous ne payez qu'après l'avoir validé. »
8. « DWTS, le monde numérique à votre service. Écrivez-nous sur WhatsApp au 062 67 14 45. »
9. « Et vous pouvez aussi gagner de l'argent avec DWTS. Inscrivez-vous gratuitement sur notre site : vous recevez votre code parrain. Partagez-le. Un ami commande un exposé, un CV ou un mémoire avec votre code ? Vous gagnez 500 francs, à chaque commande. Un commerçant prend un pack mensuel Visuo ou Logia avec votre code ? Vous gagnez de 1 000 à 5 000 francs, chaque mois de son abonnement. Exemple : deux exposés et un pack Visuo Standard, c'est 6 000 francs pour vous ce mois-ci, versés par Mobile Money. »

À l'écran, scène 8 : logo, WhatsApp, site, icône Facebook et le nom « Digital World Technology Service » (pas de lien).
