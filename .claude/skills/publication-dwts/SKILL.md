---
name: publication-dwts
description: Créer et programmer une publication Facebook pour DWTS, DEX, Visuo ou Logia (affiche, ambiance, anniversaire), de l'idée jusqu'à Metricool. À utiliser dès qu'Elie demande une publication, une affiche de page, une semaine de contenus, ou envoie un modèle de concurrent.
---

# Publication Facebook DWTS

Règles complètes : `marketing/README.md`. Bibliothèque des concurrents : `marketing/veille.md`. Modèles d'anniversaire : `marketing/modeles/anniversaire/`.

## Interdits (décisions d'Elie)

- **Rien n'est programmé sans validation** : montrer d'abord visuel + légende + date/heure, attendre « Validé ».
- Jamais « gratuit ». Jamais d'offre Netflix/IPTV. Logia : dire « un bot que nous avons automatisé », jamais « bot de DEX ».
- Captures de concurrents et photos Pinterest : jamais dans le dépôt (public). Seule l'analyse va dans `veille.md`.
- Deuil : ni vente, ni contacts, ni prix. Foot : ni vrais joueurs, ni logos de clubs. Pas de politique.

## Étapes

1. **Voir le fil.** `getScheduledPosts` (blogId 7424675, fuseau Africa/Libreville) sur ±1 semaine. Les images Metricool ne se téléchargent pas d'ici : utiliser les rendus de `media/2026-sNN/` (correspondance dans le journal du README).
2. **Choisir la mise en page** : pas la même que la publication précédente de la marque, pas d'image réutilisée en moins de 4 semaines (journal du README).
3. **Couleurs** (section « Couleurs par marque » du README) : DEX papier clair + bleu ; Visuo crème/lilas + orange/violet ; Logia blanc ou vert + turquoise ; DWTS jaune ou blanc. **Jamais deux publications sombres d'affilée.** Le bleu n'est pas la couleur par défaut.
4. **Photo d'Elie** : photos studio de `marketing/photos/` (`elie-manteau`, `elie-costume-blanc`, `elie-costume-noir`, `elie-assis`). Nouvelle photo : détourer avec rembg `birefnet-portrait` (API Python, une photo par commande, ~45 s), effacer l'étoile Gemini, garder le plus grand morceau.
5. **Rendre** : `npx http-server -p 8775 -s -c-1 .` à la racine (ne jamais `pkill -f` avec un motif présent dans la même commande), capture Playwright 1080×1350, `document.fonts.ready`. Vérifier l'image : rien de coupé, rien qui chevauche.
6. **Légende** différente du texte de l'affiche : accroche → contexte → notre réponse → question → bloc contact (🌐 lien de la page de la marque, 📲 WhatsApp : +241 62 67 14 45, 📍 Port-Gentil, Gabon) → 3 hashtags max.
7. **Montrer à Elie** : image(s) avec SendUserFile + légende + date/heure. Attendre.
8. **Après « Validé »** : copier l'image dans `media/2026-sNN/`, branche → commit → PR → merge (compétence `mise-a-jour-dwts`), vérifier l'URL `raw.githubusercontent.com/dwtsgabon/Site-DWTS-/main/...` (200), puis `createScheduledPost` (facebookData type POST, ou REEL avec videoCoverMilliseconds). Pour changer une image : `updateScheduledPost` avec le texte complet d'origine.
9. **Noter** la publication dans le « Journal des visuels publiés » du README.

## Heures habituelles

Publications de marque à 19 h. Ambiance le matin (9 h). Teaser la veille au soir (21 h), après la publication de 19 h.
