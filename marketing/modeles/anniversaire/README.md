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
| `photo` | Photo **détourée** (PNG transparent) | `/marketing/photos/elie-detoure.png` |
| `theme` | Couleurs : `bleu`, `or`, `rouge`, `emeraude`, `violet`, `gris` | selon le modèle |
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

## Idées en attente (il manque des photos)

- **Galerie / éventail** (« Grace Jason », « 2026 Gallery », « Miwa ») : une grande photo + 3 à 4 photos dans des parts. Il faut 3 à 4 photos de la même personne.
- **Duo de photos** (« Raymond Bright », « Nazeef ») : la même personne en 2 tenues. Il faut 2 photos détourées.
- **Nom géant** (« Johnson Philip ») : le prénom en lettres condensées géantes derrière la tête.
