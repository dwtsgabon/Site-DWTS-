# Exemples de réalisation Logia

Modèles de démonstration qui montrent au client ce que Logia sait faire. Ils ne sont **ni offerts ni publiés** : on les montre (captures, partage d'écran), puis on réalise la version du client sur devis.

## Pointage du personnel

- Générer le fichier de démonstration : `python3 generer_pointage.py` (crée `Pointage-du-personnel-DWTS.xlsx`, non versionné car le site est public).
- Contenu : employés (30 max), 12 mois avec listes déroulantes P/R/A/C/M et couleurs, week-ends grisés, totaux, taux de présence, salaire dû, bilan annuel.
- Testé : recalcul LibreOffice sans erreur, mois de 28 à 31 jours corrects.
- Affiche : `marketing/modeles/post-logia-4.html` (captures réelles).
