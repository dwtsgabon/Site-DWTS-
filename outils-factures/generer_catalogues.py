"""Recopie la grille de prix de generer_classeur.py vers le site et le script Google.

À lancer après chaque changement de prix :  python3 outils-factures/generer_catalogues.py
  - assets/js/catalogue-devis.js : prix Visuo et Logia (page Devis)
  - assets/js/catalogue-complet.js : toutes les prestations + impression (simulateur de la page Paiement)
  - outils-paiement/apps-script.gs : liste CATALOGUE_DEVIS (le script recalcule les devis avec ces prix)
"""
import json
import re
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
source = (RACINE / "outils-factures/generer_classeur.py").read_text(encoding="utf-8")
debut = source.index("# (branche, prestation")
fin = source.index("# --- Styles ---")
ns = {}
exec(source[debut:fin], ns)
CATALOGUE = [list(x) for x in ns["CATALOGUE"]]


def js(valeur):
    return json.dumps(valeur, ensure_ascii=False, separators=(",", ":"))


devis = [c for c in CATALOGUE if c[0] in ("Visuo", "Logia")]
impression = {c[1]: c[3] for c in CATALOGUE if c[1].startswith("Impression")}
complet = [c for c in CATALOGUE if not c[1].startswith("Impression")]

(RACINE / "assets/js/catalogue-devis.js").write_text(
    "// Prix Visuo et Logia pour la page Devis : [branche, prestation, formule, prix XAF, type].\n"
    "// Généré par outils-factures/generer_catalogues.py : ne pas modifier à la main.\n"
    f"window.DWTS_CATALOGUE = {js(devis)};\n", encoding="utf-8")
(RACINE / "assets/js/catalogue-complet.js").write_text(
    "// Toutes les prestations pour le simulateur de la page Paiement : [branche, prestation, formule, prix XAF, type].\n"
    "// Généré par outils-factures/generer_catalogues.py : ne pas modifier à la main.\n"
    f"window.DWTS_TOUT = {js(complet)};\n"
    f"window.DWTS_IMPRESSION = {{couleur:{impression['Impression page couleur']},noirblanc:{impression['Impression page noir et blanc']}}};\n",
    encoding="utf-8")

gs = RACINE / "outils-paiement/apps-script.gs"
texte = gs.read_text(encoding="utf-8")
texte, n = re.subn(r"const CATALOGUE_DEVIS = .*?;\n// FIN CATALOGUE", lambda m: f"const CATALOGUE_DEVIS = {js(devis)};\n// FIN CATALOGUE", texte, flags=re.S)
assert n == 1, "Bloc CATALOGUE introuvable dans apps-script.gs"
gs.write_text(texte, encoding="utf-8")
print(f"{len(devis)} lignes devis, {len(complet)} prestations, impression {impression}")
