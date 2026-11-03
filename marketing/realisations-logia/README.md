# Exemples de réalisation Logia

Modèles de démonstration qui montrent au client ce que Logia sait faire. Ils ne sont **ni offerts ni publiés** : on les montre (captures, partage d'écran), puis on réalise la version du client sur devis.

## Pointage du personnel

- Générer le fichier de démonstration : `python3 generer_pointage.py` (crée `Pointage-du-personnel-DWTS.xlsx`, non versionné car le site est public).
- Contenu : employés (30 max), 12 mois avec listes déroulantes P/R/A/C/M et couleurs, week-ends grisés, totaux, taux de présence, salaire dû, bilan annuel.
- Testé : recalcul LibreOffice sans erreur, mois de 28 à 31 jours corrects.
- Affiche : `marketing/modeles/post-logia-4.html` (captures réelles).

## Autres exemples (Excel, sans macro, compatibles Google Sheets)

Chaque fichier se génère avec son script et contient un « Menu principal » à liens, des listes déroulantes, des calculs automatiques et des données fictives. Éléments communs dans `base_logia.py`.

| Exemple | Script | Fichier créé |
|---|---|---|
| Archivage électronique des documents | `generer_archivage.py` | `Archivage-des-documents-DWTS.xlsx` |
| Gestion de réparations de téléphones | `generer_reparations.py` | `Gestion-reparations-telephones-DWTS.xlsx` |
| Suivi des contrats et documents | `generer_contrats.py` | `Suivi-des-contrats-DWTS.xlsx` |
| Réservation de tables | `generer_reservations.py` | `Reservation-de-tables-DWTS.xlsx` |

- Testé : recalcul LibreOffice sans erreur. Réparations : reste à payer et chiffres du tableau de bord corrects. Contrats : états En cours / À renouveler / Expiré selon la date du jour. Réservations : alerte « Table déjà prise » ou « Table trop petite », planning par date.
- Les fichiers `.xlsx` ne sont pas versionnés (site public).
