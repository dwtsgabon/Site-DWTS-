# Devis et factures DWTS (Excel)

Fichier : `DWTS_Devis_Factures.xlsx` (Excel, LibreOffice ou Google Sheets).

- **Devis Visuo** et **Devis Logia** : le client choisit ce qu'il veut. Chaque ligne a une liste déroulante (packs ou prix fixes de la branche) et une quantité ; type (unique ou mensuel), prix et totaux se calculent seuls : total unique, total mensuel, total à payer au démarrage. Impression A4 réglée.
- **Facture DEX**, **Facture Visuo**, **Facture Logia** : petite facture A5 au logo de la branche (et logo DWTS), articles en liste déroulante, total payé, moyen de paiement et TID.
- **Grille** : tous les prix (de `tarifs.html`), modifiables en bleu.
- Aucun titre en haut du cadre : « DEVIS N° » et « FACTURE N° » sont dans le corps du document.

Cases jaunes = à remplir. Un article absent de la liste peut être tapé à la main avec son prix.

Les factures des paiements validés sont aussi créées automatiquement en PDF par le tableau des paiements (voir `outils-paiement/README.md`).

Recréer le classeur après une modification du script : `python3 outils-factures/generer_classeur.py`.
