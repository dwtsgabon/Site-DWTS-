# Site DWTS + espace client DEX

Site vitrine de Digital World Technology Service (dossier `public/`) et espace client DEX :
inscription, commandes, paiement par Chariow, parrainage. Les données sont dans un Google Sheet.

```
public/            le site vitrine (mêmes adresses qu'avant : /dex.html, /tarifs.html, /assets/...)
src/               le serveur (Node.js + Express)
config/regles.json prix d'impression, commissions, minimum de versement (modifiable)
scripts/           outils : préparer le Sheet, simuler un paiement
```

> ⚠️ Ce dépôt est **public**. Ne mettez jamais de secret dans un fichier (clé Google, secret du Pulse,
> mot de passe). Les secrets vont **uniquement** dans les variables Railway.

---

## 1. Google : compte de service et partage du Sheet

Le site écrit dans le Google Sheet **« DEX – Base »** avec un « compte robot » (compte de service).

1. Allez sur <https://console.cloud.google.com> avec votre compte Google. Créez un projet **DEX Site**.
2. Menu **API et services → Bibliothèque** → cherchez **Google Sheets API** → **Activer**.
3. Menu **IAM et administration → Comptes de service → Créer un compte de service**.
   Nom : `dex-site` → **OK** (aucun rôle à donner).
4. Cliquez sur le compte créé → onglet **Clés** → **Ajouter une clé → Créer une clé → JSON**.
   Un fichier `.json` est téléchargé. **C'est la clé du site : ne la partagez avec personne.**
5. Ouvrez le Google Sheet → **Partager** → collez l'e-mail du compte de service
   (`dex-site@….iam.gserviceaccount.com`) → rôle **Éditeur** → décochez « Envoyer une notification » → **Partager**.
6. Notez l'identifiant du Sheet : dans son adresse, la partie entre `/d/` et `/edit`.

**Transformer la clé en base64** (une seule ligne, pour Railway). Sur Windows, ouvrez **PowerShell**
dans le dossier du fichier et tapez (remplacez le nom du fichier) :

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("cle-dex.json")) | Set-Clipboard
```

Le résultat est copié : collez-le directement dans Railway (étape 2). N'utilisez jamais un site web
pour cette conversion. Si vous n'y arrivez pas, vous pouvez aussi coller le contenu du fichier JSON
tel quel : le site accepte les deux.

---

## 2. Déploiement sur Railway

1. Créez un compte sur <https://railway.com> (connexion avec GitHub).
2. **New Project → Deploy from GitHub repo** → choisissez `Site-DWTS-`.
3. Dans le service : **Settings → Source → Branch** : choisissez **`app-dex`**.
4. **Settings → Networking → Generate Domain**. Vous obtenez une adresse comme
   `https://site-dwts-production.up.railway.app` (HTTPS inclus).
5. Onglet **Variables** → ajoutez :

| Variable | Valeur |
|---|---|
| `NODE_ENV` | `production` |
| `SESSION_SECRET` | une longue suite aléatoire (voir ci-dessous) |
| `GOOGLE_SHEET_ID` | l'identifiant du Sheet |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | la clé en base64 (étape 1) |
| `CHARIOW_PRODUCT_URL` | le lien public du produit DEX sur Chariow |
| `CHARIOW_PULSE_SECRET` | le secret du Pulse (étape 3, à ajouter ensuite) |
| `WHATSAPP_NUMBER` | `24162671445` |
| `SITE_URL` | l'adresse de l'étape 4, sans `/` à la fin |

Ne remplissez pas `PORT` : Railway le donne tout seul.

**Créer le `SESSION_SECRET`** dans PowerShell (copie le résultat) :

```powershell
$o = New-Object byte[] 48; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($o); [Convert]::ToBase64String($o) | Set-Clipboard
```

6. Railway redémarre le site à chaque changement. Vérifiez :
   - `https://VOTRE-ADRESSE/health` affiche `{"ok":true}` ;
   - le Google Sheet a maintenant 6 onglets : Utilisateurs, Commandes, Commissions, Versements,
     Pulses_recus, Paiements_non_rapproches ;
   - en cas de souci : onglet **Deployments → View logs** (messages en français).

---

## 3. Le Pulse dans Chariow (confirmation de paiement)

1. Dans Chariow : **Automatisations → Pulses → Ajouter un Pulse**.
2. URL : `https://VOTRE-ADRESSE/webhooks/chariow`
3. Événement : **Successful Sale** (`successful.sale`) uniquement.
4. Produits : choisissez **uniquement le produit DEX**.
5. Enregistrez, puis ouvrez le Pulse → **Overview → Signing secret → Reveal → Copy**
   (il commence par `whsec_`). Collez-le dans la variable Railway `CHARIOW_PULSE_SECRET`.
6. Testez : **Send test pulse**. Dans le Sheet, l'onglet **Pulses_recus** reçoit une ligne avec le résultat `test`.

> Si le site ne répond pas 5 fois de suite, Chariow **désactive le Pulse** et vous envoie un e-mail.
> Il faut alors le réactiver dans Chariow, puis rejouer les livraisons manquées (onglet **Deliveries → Replay**).

---

## 4. Utilisation au quotidien

**Créer une commande** (onglet **Commandes**) : remplissez seulement les 4 premières colonnes :
`numero_commande` (ex. `DEX-001`), `email_client` (l'e-mail du compte du client), `type_document`, `prix_fixe` (ex. `2500`).
Laissez les autres colonnes vides : le site les remplit.

**Statuts** (colonne `statut`) :

| Statut | Signification | Qui le met |
|---|---|---|
| *(vide)* | à payer | vous (en créant la commande) |
| `en_attente_paiement` | le client a cliqué sur « Payer » | le site |
| `paye` | montant exact reçu → livrez sur WhatsApp | le site (ou vous) |
| `montant_different` | montant reçu ≠ montant attendu → ne livrez pas | le site |
| `livre` | document livré | vous |

**Paiements_non_rapproches** : paiements que le site n'a pas su relier à une commande
(e-mail différent, client qui a payé sans passer par « Payer »…). Vérifiez-les et corrigez la commande à la main.

**Versements** (chaque fin de mois) : une ligne par parrain payé : `date`, `code_parrain`, `montant`, `moyen`, `note`.

**Règles modifiables** dans `config/regles.json` : prix des pages d'impression (500 / 200), seuil et montants
des commissions (1 500 → 300 / 500), minimum de versement (5 000).

---

## Pour les développeurs

```bash
npm install
cp .env.example .env       # puis remplir .env
npm start                  # http://localhost:3000
SHEETS_MEMOIRE=1 npm start # sans Google : base temporaire en mémoire
npm run preparer-sheet     # crée les onglets du Sheet
npm run simuler-pulse -- --email client@exemple.com --montant 2500 --url https://VOTRE-ADRESSE
```

`simuler-pulse` envoie un faux paiement signé avec `CHARIOW_PULSE_SECRET` (lu dans `.env`).
