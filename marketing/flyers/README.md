# Flyers et affiches imprimés

Publicité hors Facebook (idée d'Elie, 3 nov. 2026) : flyers pour les élèves, distribués près des établissements par des élèves ambassadeurs (parrainage).

## Flyer DEX élèves (`flyer-dex.html`)
- A5 recto-verso (recto : accroche, prix, QR ; verso : grille des tarifs de `tarifs.html`, étapes de commande). Même mise en page pour l'affiche A3.
- **Prix recopiés de `tarifs.html` le 3 nov. 2026 : à revérifier avant chaque impression.**
- Pas d'offre élève tant qu'Elie ne l'a pas décidée. Jamais « gratuit ».

## QR code par établissement
`python3 qr.py LYC-A LYC-B ...` crée `qr-LYC-A.svg`, etc. Le QR ouvre WhatsApp (062 67 14 45) avec « Bonjour DEX, j'ai vu l'affiche (LYC-A). Je voudrais commander. » : le code dit d'où vient le client. `GEN` = flyer sans établissement.

## Exporter
Serveur local à la racine (`npx http-server -p 8775 -s -c-1 .`), puis page `flyer-dex.html?face=recto|verso&code=LYC-A&parrain=CODE` :
- A5 300 ppp : capture 874×1240 avec `deviceScaleFactor: 2` ; PDF 148×210 mm (`printBackground`) pour l'imprimeur.
- A3 : même page avec `deviceScaleFactor: 4`.
- Vérifier le QR après export (lecture avec OpenCV `QRCodeDetector`).
