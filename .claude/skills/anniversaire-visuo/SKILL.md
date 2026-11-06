---
name: anniversaire-visuo
description: Créer une affiche « Joyeux anniversaire » pour une personne (client, ami, équipe) à partir de ses photos, et proposer 5 modèles de la bibliothèque. À utiliser dès qu'Elie envoie une ou plusieurs photos avec un prénom pour un anniversaire. Fait partie des visuels Visuo.
---

# Anniversaire Visuo (5 propositions à partir des photos)

Bibliothèque : `marketing/modeles/anniversaire/` (README = paramètres et thèmes). Règles générales de publication : compétence `publication-dwts`.

## Entrées à récupérer
Prénom (nom : mettre `%20`, un espace, sinon le nom d'Elie s'affiche), **date** (si absente : dire l'hypothèse, ex. date du jour), âge : **jamais affiché** sauf demande. Message : court, adapté à la tenue/ambiance de la photo, sans référence religieuse sauf demande.

## Règles d'Elie
- **Jamais la photo d'Elie** sur l'affiche d'un autre : les modèles ont par défaut `elie-*.png` pour `photo`, `photo2`, `photo3`, `photo4`. Toujours passer **toutes** les photos utilisées dans l'adresse, et si le client n'a qu'une photo, choisir un modèle qui n'en demande qu'une. Vérifier sur l'image qu'aucune photo d'Elie n'apparaît.
- **Pas les mêmes modèles que l'anniversaire précédent** (voir le journal du README : 3 et 5 déjà utilisés pour Elie). Proposer d'autres, et en créer un nouveau (section « Ajouter un modèle » du README) si la bibliothèque ne suffit pas.

## Étapes
1. **Regarder chaque photo** : format (portrait / paysage), cadrage (buste, en pied, assis), couleurs dominantes de la tenue et du fond.
2. **Détourer** avec rembg `birefnet-portrait` (une photo par commande, ~1 min la première fois : le modèle de 1 Go se télécharge). Photo de groupe ou paysage : recadrer d'abord sur la personne. Effacer les objets d'autres personnes qui dépassent (baguette, chaise) sans toucher à l'instrument.
3. **Photos du client : jamais dans le dépôt public.** Les copier dans `marketing/photos-tmp/` (non commité), rendre, puis **supprimer** ce dossier.
4. **Choisir 5 modèles** selon la photo :
   - Portrait buste/cuisses : `2-grand-chiffre`, `1-mot-vertical`, `4-bande-date`, `3-titre-derriere`, `8-nom-geant`.
   - Deux photos : `7-duo` (la meilleure combinaison : portrait net + autre photo en reflet).
   - Photo large (musicien avec instrument, assis) : elle devient petite dans les modèles portrait ; la mettre en **reflet** (`7-duo`) plutôt qu'en photo principale.
   - Quatre photos et plus : `6-galerie`. Veille de l'anniversaire : `5-chargement`.
   - Thème = couleur de la tenue (veste turquoise → `emeraude`), pas le bleu par défaut. Pas 5 fonds sombres : en mettre au moins 2 clairs (`creme`, `gris`).
5. **Rendre** (serveur `npx http-server -p 8775 -s -c-1 .`, Playwright 1080×1350, `document.fonts.ready`). Adresse : `?prenom=…&nom=%20&jour=…&mois=…&jsem=…&role=De%20la%20part%20de%20Visuo&message=…&photo=/marketing/photos-tmp/x.png&theme=…`.
6. **Contrôler** chaque image : rien de coupé, texte lisible (si la photo recouvre un titre, changer de modèle), date juste.
7. **Montrer** les 5 avec SendUserFile + légende proposée + heure. Rien n'est programmé sans « Validé ».
8. Noter dans le « Journal des visuels publiés » du README après publication.
