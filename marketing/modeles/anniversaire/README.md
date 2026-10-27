# Bibliothèque des modèles d'anniversaire

Modèles réutilisables : on change le nom, la date, la photo et les couleurs **dans l'adresse**, sans toucher au code.
Chaque modèle vient d'une inspiration envoyée par Elie (Pinterest, concurrents). Les captures d'origine ne sont pas stockées ici (dépôt public) : seule l'idée de mise en page est reprise, jamais le visuel.

Aperçus : dossier `apercus/`.

## Les modèles

| # | Fichier | Idée | Thème par défaut | Photo | Inspiration |
|---|---|---|---|---|---|
| 0 | `../pro-ambiance-anniversaire.html` | Photo dans un cercle bleu, confettis aux couleurs du logo | bleu (fixe) | oui | — (premier modèle DWTS) |
| 1 | `1-mot-vertical.html` | Grand mot « Joyeux » couché à gauche, reflet géant de la photo, prénom en écriture | bleu | oui | « Happy Seun » (vert émeraude) |
| 2 | `2-grand-chiffre.html` | Le jour en chiffre géant détouré derrière la personne | rouge | oui | « 29 October », « 30 Irana » |
| 3 | `3-titre-derriere.html` | Grand titre doré, la personne passe devant, nom écriture + capitales | or | oui | « Dr. Samuel Afriyie » |
| 4 | `4-bande-date.html` | Bande noire avec la date, reflet noir et blanc, nom en grosses lettres | gris | oui | « Kelly Ilunga » |
| 5 | `5-chargement.html` | « Mon anniversaire en téléchargement… 89 % » — à publier **la veille** | bleu | non | « Mon anniversaire en téléchargement » |
| 6 | `6-galerie.html` | Photo principale devant, 3 autres photos en noir et blanc dans des parts de cercle, rubans de vœux | creme | 4 photos | « Miss Grace Jason », « 2026 Gallery » |
| 7 | `7-duo.html` | Grand portrait en reflet à gauche, la même personne en pied à droite | violet | 2 photos | « Hon. Nazeef », « Raymond Bright » |
| 8 | `8-nom-geant.html` | Prénom en lettres géantes derrière la tête, date dans un cercle, petite photo en pied | bleu | 2 photos | « Celebrating Johnson » |

## Paramètres (dans l'adresse)

Sans paramètre : anniversaire d'Elie (30 octobre). Exemple pour un autre :

```
2-grand-chiffre.html?prenom=Merveille&nom=Ndong&jour=19&mois=Novembre&role=Cliente%20DWTS&theme=violet&photo=/marketing/photos/merveille-detoure.png
```

| Paramètre | Rôle | Par défaut |
|---|---|---|
| `prenom`, `nom` | Nom affiché | Elie Ryan / Mbwendi Mbadinga |
| `jour`, `mois`, `annee`, `jsem` | Date (jsem = jour de la semaine) | 30 / Octobre / 2026 / Vendredi |
| `role` | Ligne sous le nom | Fondateur de DWTS |
| `message` | Petit vœu (modèles 1 et 4) | Que cette nouvelle année t'apporte santé, succès et sagesse. |
| `photo` | Photo principale **détourée** (PNG transparent) | `elie-detoure.png` (lunettes de soleil) |
| `photo2`, `photo3`, `photo4` | Autres photos détourées (modèles 6, 7, 8) | `elie-pull.png`, `elie-chemise.png`, `elie-costume.png` (en pied) |
| `surnom` | Mot géant du modèle 8 | Elie |
| `theme` | Couleurs : `bleu`, `or`, `rouge`, `emeraude`, `violet`, `gris`, `creme` | selon le modèle |
| `ligne1`, `pourcent` | Modèle 5 : mot en écriture, remplissage de la barre | Mon / 89 |

Les couleurs des thèmes sont dans `_anniv.js` (tableau `T`). Polices : Montserrat, Anton, Great Vibes (écriture), Playfair Display (classique), dans `marketing/polices/`.

## Rendu

Serveur local à la racine du dépôt (`npx http-server -p 8775 -s -c-1 .`), puis capture 1080×1350 avec Playwright (même méthode que les autres affiches).

## Ajouter un modèle (à chaque inspiration envoyée par Elie)

1. Décrire la mise en page en une phrase (ce qui la rend unique : chiffre géant, mot vertical, reflet…).
2. Vérifier qu'elle n'existe pas déjà dans le tableau ci-dessus.
3. Créer `N-nom-court.html` en partant d'un modèle proche : garder `_anniv.css`, `_anniv.js` et les `data-v` (textes) / `data-photo` (photos).
4. Rendre avec les valeurs par défaut **et** un autre thème pour vérifier que rien ne déborde.
5. Ajouter une ligne au tableau et un aperçu dans `apercus/`.
6. Montrer à Elie avant toute publication.

## Photos disponibles ()

Détourées avec rembg (modèle ). Les photos studio (générées par Elie avec Gemini) sont les photos **par défaut** ; l'étoile Gemini a été effacée.

| Fichier | Tenue | Cadrage | Usage par défaut |
|---|---|---|---|
|  | manteau marron, lunettes, éclairage studio | buste, de trois quarts | photo principale (modèles 0 à 8) |
|  | costume noir, chemise blanche | debout, jusqu'aux cuisses | modèle 7 (en pied), 6 (part de cercle) |
|  | costume noir, lunettes de soleil | debout, jusqu'aux cuisses | modèle 8 (petite photo), 6 |
|  | t-shirt noir, assis | en entier (bouts de chaise visibles en bas) | modèle 6 (part de cercle, visage seul) |
| , , ,  | anciennes photos (selfies) | — | en réserve |

**Attention au cadrage :** les modèles sont réglés pour une photo buste comme . Une photo plus large ou plus serrée peut cacher le titre : toujours vérifier le rendu.
