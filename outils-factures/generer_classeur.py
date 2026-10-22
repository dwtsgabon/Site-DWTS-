"""Génère DWTS_Devis_Factures.xlsx : devis Visuo et Logia, factures DEX, Visuo et Logia.

Les prix viennent de tarifs.html (grille validée). Pour changer un prix, modifier la feuille « Grille »
directement dans Excel : devis et factures se recalculent. Ce script ne sert qu'à recréer le classeur.

Usage : python3 outils-factures/generer_classeur.py
"""
from pathlib import Path

from openpyxl import Workbook
from openpyxl.drawing.image import Image as ImageXL
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.workbook.defined_name import DefinedName
from openpyxl.worksheet.datavalidation import DataValidation
from PIL import Image

RACINE = Path(__file__).resolve().parent.parent
SORTIE = RACINE / "outils-factures" / "DWTS_Devis_Factures.xlsx"
LOGOS = {
    "DWTS": RACINE / "assets/img/logo-dwts.png",
    "DEX": RACINE / "assets/img/logo-dex-facture.png",
    "Visuo": RACINE / "assets/img/logo-visuo.png",
    "Logia": RACINE / "assets/img/logo-logia.png",
}
COULEURS = {"DEX": "1E6FD9", "Visuo": "FF6A00", "Logia": "1E9FD9"}
CONTACT = "Port-Gentil, Gabon  ·  WhatsApp 062 67 14 45  ·  digitalwtservice@gmail.com"
NOM_DWTS = "DWTS · Digital World Technology Service"

# (branche, prestation, formule, prix, type) ; type = Unique ou Mensuel
CATALOGUE = []


def ajouter(branche, prestation, formules, type_="Unique"):
    for formule, prix in formules:
        CATALOGUE.append((branche, prestation, formule, prix, type_))


B_S_P = ("Basique", "Standard", "Premium")
# --- DEX (prix de tarifs.html) ---
for palier, desc, m1, m2 in [
    (1, "4 pages ou moins", 2500, 4000), (2, "5 à 9 pages ou images", 4000, 5500),
    (3, "10 pages ou plus", 5500, 7000), (4, "tableaux, 10 à 14 pages", 7000, 8500),
    (5, "tableaux, 15 pages ou plus", 8500, 10000)]:
    ajouter("DEX", f"Exposé palier {palier} ({desc})", [("Mode 1", m1), ("Mode 2", m2)])
for prestation, m1, m2 in [("CV + lettre de motivation", 1500, 3000), ("Rapport de stage", 7500, 10500),
                           ("Mémoire Bac+1 à Bac+3", 10500, 13500), ("Document professionnel", 10500, 15500),
                           ("Master et thèse", 15500, 18500)]:
    ajouter("DEX", prestation, [("Mode 1", m1), ("Mode 2", m2)])
ajouter("DEX", "Impression page couleur", [("Par page", 500)])
ajouter("DEX", "Impression page noir et blanc", [("Par page", 200)])
# --- Visuo ---
for prestation, prix, type_ in [
    ("Logo", (6500, 10000, 15000), "Unique"), ("Affiche ou flyer", (2500, 4000, 6000), "Unique"),
    ("Carte d'invitation", (2000, 3000, 5000), "Unique"), ("Carte de visite", (2000, 3000, 5000), "Unique"),
    ("Modèle de facture ou devis", (2500, 3500, 5000), "Unique"),
    ("Vidéo publicitaire 15 à 30 s", (7500, 9500, 15000), "Unique"),
    ("Site vitrine", (12500, 25000, 45000), "Unique"), ("Maintenance du site", (2500, 5000, 10000), "Mensuel"),
    ("Gestion des pages", (7000, 12500, 22000), "Mensuel")]:
    ajouter("Visuo", prestation, list(zip(B_S_P, prix)), type_)
ajouter("Visuo", "Gestion du compte WhatsApp", [("Toutes formules", 10000)], "Mensuel")
ajouter("Visuo", "Publication réseaux", [("À l'unité", 1000)])
ajouter("Visuo", "Pack Starter (1 affiche, 4 publications)", [("Pack", 6000)], "Mensuel")
ajouter("Visuo", "Pack Basique (2 affiches, 8 publications, 1 vidéo)", [("Pack", 18000)], "Mensuel")
ajouter("Visuo", "Pack Standard (4 affiches, 12 publications, 2 vidéos, maintenance)", [("Pack", 50000)], "Mensuel")
ajouter("Visuo", "Pack Premium (6 affiches, 20 publications, 4 vidéos, maintenance)", [("Pack", 115000)], "Mensuel")
ajouter("Visuo", "Site + facture avec un pack", list(zip(B_S_P, (15000, 28000, 50000))))
# --- Logia ---
for prestation, prix in [("Automatisation", (7500, 15000, 30000)), ("Bot WhatsApp", (15000, 30000, 60000)),
                         ("Logiciel de gestion", (45000, 90000, 180000))]:
    ajouter("Logia", prestation, list(zip(B_S_P, prix)))
ajouter("Logia", "Suivi", list(zip(B_S_P, (5000, 10000, 20000))), "Mensuel")
for pack, depart, suivi in [("Starter", 7500, 5000), ("Business", 40000, 10000), ("Entreprise", 110000, 20000)]:
    ajouter("Logia", f"Pack {pack} : mise en service", [("Pack", depart)])
    ajouter("Logia", f"Pack {pack} : suivi", [("Pack", suivi)], "Mensuel")

# --- Styles ---
fin = Side(style="thin", color="D9DCE3")
JAUNE = PatternFill("solid", fgColor="FFF4B8")
GRIS = PatternFill("solid", fgColor="F3F4F6")
BLEU_SAISIE = Font(color="1E40AF")
GRAS = Font(bold=True)


def couleur(branche):
    return PatternFill("solid", fgColor=COULEURS[branche])


def article(branche, prestation, formule):
    return prestation if formule in ("Pack", "Toutes formules", "À l'unité", "Par page") else f"{prestation} · {formule}"


def image(chemin, largeur):
    """Image redimensionnée en pixels, prête à insérer."""
    tmp = SORTIE.parent / f".tmp_{chemin.stem}_{largeur}.png"
    im = Image.open(chemin).convert("RGB")
    hauteur = round(im.height * largeur / im.width)
    im.resize((largeur, hauteur), Image.LANCZOS).save(tmp)
    return ImageXL(str(tmp)), hauteur


def feuille_grille(wb):
    ws = wb.active
    ws.title = "Grille"
    ws["A1"] = "GRILLE DE PRIX DWTS (XAF)"
    ws["A1"].font = Font(bold=True, size=14)
    ws["A2"] = "Prix de tarifs.html. Les prix en bleu sont modifiables : devis et factures se recalculent."
    ws["A2"].font = Font(italic=True, color="6B7280")
    entetes = ["Branche", "Prestation", "Formule", "Article (liste des devis et factures)", "Prix (XAF)", "Type"]
    for i, t in enumerate(entetes, 1):
        c = ws.cell(4, i, t)
        c.font = Font(bold=True, color="FFFFFF")
        c.fill = PatternFill("solid", fgColor="111827")
    plages = {}
    ligne = 5
    for branche in ("DEX", "Visuo", "Logia"):
        debut = ligne
        for b, prestation, formule, prix, type_ in CATALOGUE:
            if b != branche:
                continue
            valeurs = [b, prestation, formule, article(b, prestation, formule), prix, type_]
            for i, v in enumerate(valeurs, 1):
                c = ws.cell(ligne, i, v)
                c.border = Border(bottom=fin)
            ws.cell(ligne, 5).font = BLEU_SAISIE
            ws.cell(ligne, 5).number_format = "#,##0"
            ligne += 1
        plages[branche] = (debut, ligne - 1)
        ligne += 1
    for col, largeur in zip("ABCDEF", (10, 52, 16, 66, 12, 10)):
        ws.column_dimensions[col].width = largeur
    ws.freeze_panes = "A5"
    fin_tout = ligne - 2
    wb.defined_names["Articles"] = DefinedName("Articles", attr_text=f"Grille!$D$5:$D${fin_tout}")
    wb.defined_names["Prix"] = DefinedName("Prix", attr_text=f"Grille!$E$5:$E${fin_tout}")
    wb.defined_names["Types"] = DefinedName("Types", attr_text=f"Grille!$F$5:$F${fin_tout}")
    for branche, (d, f) in plages.items():
        wb.defined_names[f"Liste_{branche}"] = DefinedName(f"Liste_{branche}", attr_text=f"Grille!$D${d}:$D${f}")
    return ws


def entete(ws, branche, derniere_col, largeur_logo, largeur_dwts):
    """Logos de la branche (gauche) et de DWTS (droite), coordonnées. Aucun titre en haut du cadre."""
    logo, h = image(LOGOS[branche], largeur_logo)
    ws.add_image(logo, "A1")
    dwts, _ = image(LOGOS["DWTS"], largeur_dwts)
    ws.add_image(dwts, f"{derniere_col}1")
    lignes_logo = max(4, round(h / 20) + 1)
    r = lignes_logo + 1
    ws.cell(r, 1, NOM_DWTS).font = Font(bold=True, size=10)
    ws.cell(r + 1, 1, CONTACT).font = Font(size=9, color="6B7280")
    for col in range(1, ord(derniere_col) - ord('A') + 2):
        ws.cell(r + 1, col).border = Border(bottom=Side(style="medium", color=COULEURS[branche]))
    return r + 3


def lignes_articles(ws, branche, premiere, nb, cols):
    """cols : dict colonne -> lettre (article, qte, type, pu, total). Listes déroulantes par branche."""
    dv = DataValidation(type="list", formula1=f"=Liste_{branche}", allow_blank=True,
                        showErrorMessage=False)  # un article hors liste reste possible (prix à saisir)
    ws.add_data_validation(dv)
    a, q, t, p, tot = cols["article"], cols["qte"], cols.get("type"), cols["pu"], cols["total"]
    for r in range(premiere, premiere + nb):
        ws[f"{a}{r}"].fill = JAUNE
        dv.add(f"{a}{r}")
        ws[f"{q}{r}"].fill = JAUNE
        ws[f"{q}{r}"].alignment = Alignment(horizontal="center")
        if t:
            ws[f"{t}{r}"] = f'=IF({a}{r}="","",IFERROR(INDEX(Types,MATCH({a}{r},Articles,0)),"Unique"))'
            ws[f"{t}{r}"].alignment = Alignment(horizontal="center")
        ws[f"{p}{r}"] = f'=IF({a}{r}="","",IFERROR(INDEX(Prix,MATCH({a}{r},Articles,0)),0))'
        ws[f"{tot}{r}"] = f'=IF({a}{r}="","",IF({q}{r}="",1,{q}{r})*{p}{r})'
        for c in (p, tot):
            ws[f"{c}{r}"].number_format = '#,##0" XAF";;""'
            ws[f"{c}{r}"].alignment = Alignment(horizontal="right")
        for col in cols.values():
            ws[f"{col}{r}"].border = Border(bottom=fin)
            ws[f"{col}{r}"].font = Font(size=10)
        ws[f"{a}{r}"].alignment = Alignment(wrap_text=True, vertical="center")


def feuille_devis(wb, branche):
    ws = wb.create_sheet(f"Devis {branche}")
    for col, largeur in zip("ABCDE", (50, 7, 11, 15, 16)):
        ws.column_dimensions[col].width = largeur
    r = entete(ws, branche, "E", 230, 70)
    accent = COULEURS[branche]

    # Bloc client (gauche) et références du devis (droite) : le mot DEVIS n'apparaît que dans le corps
    ws.cell(r, 1, "DEVIS ÉTABLI POUR").font = Font(bold=True, size=9, color=accent)
    infos = [("DEVIS N°", f"DEV-{branche[0]}-001"), ("Date", "=TODAY()"), ("Validité (jours)", 15),
             ("Valable jusqu'au", None)]
    for i, (lib, val) in enumerate(infos):
        ws.cell(r + i, 4, lib).font = Font(bold=(i == 0), size=9)
        ws.cell(r + i, 4).alignment = Alignment(horizontal="right")
        c = ws.cell(r + i, 5, val if val is not None else f"=E{r + 1}+E{r + 2}")
        c.alignment = Alignment(horizontal="right")
        if i in (1, 3):
            c.number_format = "DD/MM/YYYY"
        if i < 3:
            c.fill = JAUNE
    ws.cell(r, 5).font = Font(bold=True, color=accent)
    for i, aide in enumerate(["Nom du client", "Activité ou besoin", "WhatsApp du client"], 1):
        c = ws.cell(r + i, 1, aide)
        c.fill = JAUNE
        c.font = Font(bold=(i == 1), size=11 if i == 1 else 9, color="111827" if i == 1 else "4B5563")

    # Tableau
    t = r + 5
    for i, titre in enumerate(["Article (choisir dans la liste)", "Qté", "Type", "Prix unitaire", "Total"], 1):
        c = ws.cell(t, i, titre)
        c.font = Font(bold=True, color="FFFFFF", size=10)
        c.fill = PatternFill("solid", fgColor="111827")
        c.alignment = Alignment(horizontal="left" if i == 1 else "center")
    nb = 12
    lignes_articles(ws, branche, t + 1, nb, {"article": "A", "qte": "B", "type": "C", "pu": "D", "total": "E"})
    d, f = t + 1, t + nb

    s = f + 2
    totaux = [("Total paiement unique (une seule fois)", f'=SUMIF(C{d}:C{f},"Unique",E{d}:E{f})'),
              ("Total mensuel (à chaque mois)", f'=SUMIF(C{d}:C{f},"Mensuel",E{d}:E{f})'),
              ("TOTAL À PAYER AU DÉMARRAGE", f"=E{s}+E{s + 1}")]
    for i, (lib, formule) in enumerate(totaux):
        ws.merge_cells(start_row=s + i, start_column=1, end_row=s + i, end_column=4)
        c = ws.cell(s + i, 1, lib)
        c.alignment = Alignment(horizontal="right")
        v = ws.cell(s + i, 5, formule)
        v.number_format = '#,##0" XAF"'
        v.alignment = Alignment(horizontal="right")
        if i == 2:
            for col in range(1, 6):
                ws.cell(s + i, col).fill = couleur(branche)
                ws.cell(s + i, col).font = Font(bold=True, color="FFFFFF", size=12)
        else:
            c.font = GRAS
            v.font = GRAS

    n = s + 4
    notes = {
        "Visuo": ["Paiement après validation de l'aperçu, par Airtel Money (074 74 13 03) ou Mobicash (062 67 14 45).",
                  "Les packs et la gestion se renouvellent chaque mois ; la publicité payante (Ads) n'est pas comprise.",
                  "Montants en XAF selon la grille Visuo. Cases jaunes modifiables : tout se recalcule."],
        "Logia": ["Mise en service après validation de la démonstration ; paiement par Airtel Money ou Mobicash.",
                  "Le suivi mensuel démarre le mois de la mise en service et se renouvelle chaque mois.",
                  "Montants en XAF selon la grille Logia. Cases jaunes modifiables : tout se recalcule."]}[branche]
    ws.cell(n, 1, "Conditions").font = Font(bold=True, size=9, color=accent)
    for i, texte in enumerate(notes, 1):
        ws.merge_cells(start_row=n + i, start_column=1, end_row=n + i, end_column=5)
        ws.cell(n + i, 1, texte).font = Font(size=8, color="4B5563")
        ws.cell(n + i, 1).alignment = Alignment(wrap_text=True)

    g = n + 5
    ws.cell(g, 1, "Bon pour accord (client)").font = GRAS
    ws.cell(g, 4, f"Pour {branche}").font = GRAS
    ws.cell(g + 4, 1, "Nom, date et signature").font = Font(size=8, color="6B7280")
    ws.cell(g + 4, 4, "Date et signature").font = Font(size=8, color="6B7280")
    for col in (1, 4, 5):
        ws.cell(g + 3, col).border = Border(bottom=fin)

    mise_en_page(ws, f"A1:E{g + 4}", "A4")
    return ws


def feuille_facture(wb, branche):
    ws = wb.create_sheet(f"Facture {branche}")
    for col, largeur in zip("ABCD", (38, 6, 12, 13)):
        ws.column_dimensions[col].width = largeur
    r = entete(ws, branche, "D", 140 if branche == "DEX" else 190, 55)
    accent = COULEURS[branche]

    ws.cell(r, 1, "FACTURÉ À").font = Font(bold=True, size=9, color=accent)
    for i, (lib, val) in enumerate([("FACTURE N°", f"FAC-{branche[0]}-0001"), ("Date", "=TODAY()")]):
        ws.cell(r + i, 3, lib).font = Font(bold=(i == 0), size=9)
        ws.cell(r + i, 3).alignment = Alignment(horizontal="right")
        c = ws.cell(r + i, 4, val)
        c.fill = JAUNE
        c.alignment = Alignment(horizontal="right")
        if i == 1:
            c.number_format = "DD/MM/YYYY"
    ws.cell(r, 4).font = Font(bold=True, color=accent)
    for i, aide in enumerate(["Nom du client", "WhatsApp du client"], 1):
        c = ws.cell(r + i, 1, aide)
        c.fill = JAUNE
        c.font = Font(bold=(i == 1), size=10 if i == 1 else 9)

    t = r + 4
    for i, titre in enumerate(["Désignation", "Qté", "Prix unit.", "Total"], 1):
        c = ws.cell(t, i, titre)
        c.font = Font(bold=True, color="FFFFFF", size=9)
        c.fill = PatternFill("solid", fgColor="111827")
        c.alignment = Alignment(horizontal="left" if i == 1 else "center")
    nb = 6
    lignes_articles(ws, branche, t + 1, nb, {"article": "A", "qte": "B", "pu": "C", "total": "D"})
    d, f = t + 1, t + nb

    s = f + 1
    ws.merge_cells(start_row=s, start_column=1, end_row=s, end_column=3)
    ws.cell(s, 1, "TOTAL PAYÉ").alignment = Alignment(horizontal="right")
    ws.cell(s, 4, f"=SUM(D{d}:D{f})").number_format = '#,##0" XAF"'
    for col in range(1, 5):
        ws.cell(s, col).fill = couleur(branche)
        ws.cell(s, col).font = Font(bold=True, color="FFFFFF", size=11)

    p = s + 2
    moyens = DataValidation(type="list", formula1='"Airtel Money,Mobicash,Dépôt chez un agent,Carte (Chariow)"',
                            allow_blank=True)
    ws.add_data_validation(moyens)
    for i, (lib, val) in enumerate([("Payé par", "Airtel Money"), ("Le", "=TODAY()"), ("TID", "")]):
        ws.cell(p + i, 1, lib).font = Font(size=9, color="4B5563")
        ws.cell(p + i, 1).alignment = Alignment(horizontal="right")
        c = ws.cell(p + i, 2, val)
        c.fill = JAUNE
        c.font = Font(size=9)
        ws.merge_cells(start_row=p + i, start_column=2, end_row=p + i, end_column=4)
        if i == 0:
            moyens.add(c.coordinate)
        if i == 1:
            c.number_format = "DD/MM/YYYY"
            c.alignment = Alignment(horizontal="left")
    m = p + 4
    ws.merge_cells(start_row=m, start_column=1, end_row=m, end_column=4)
    ws.cell(m, 1, "Merci pour votre confiance !").font = Font(bold=True, color=accent)
    ws.cell(m, 1).alignment = Alignment(horizontal="center")
    mise_en_page(ws, f"A1:D{m}", "A5")
    return ws


def mise_en_page(ws, zone, format_):
    ws.print_area = zone
    ws.page_setup.orientation = "portrait"
    ws.page_setup.paperSize = ws.PAPERSIZE_A4 if format_ == "A4" else ws.PAPERSIZE_A5
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 1
    ws.sheet_properties.pageSetUpPr.fitToPage = True
    ws.print_options.horizontalCentered = True
    ws.page_margins.left = ws.page_margins.right = 0.4
    ws.page_margins.top = ws.page_margins.bottom = 0.4
    ws.sheet_view.showGridLines = False


def feuille_aide(wb):
    ws = wb.create_sheet("Mode d'emploi", 0)
    ws.column_dimensions["A"].width = 110
    textes = [
        ("DEVIS ET FACTURES DWTS", Font(bold=True, size=14)),
        ("", None),
        ("Devis (Visuo, Logia)", Font(bold=True)),
        ("1. Ouvrir l'onglet « Devis Visuo » ou « Devis Logia ».", None),
        ("2. Remplir les cases jaunes : numéro, nom du client, besoin, WhatsApp.", None),
        ("3. Pour chaque ligne, choisir l'article dans la liste (pack ou prix fixe, selon le besoin du client) et la quantité.", None),
        ("   Type, prix et totaux se remplissent seuls : total unique, total mensuel et total à payer au démarrage.", None),
        ("4. Fichier > Imprimer (ou Exporter en PDF) : la mise en page A4 est déjà réglée.", None),
        ("", None),
        ("Factures (DEX, Visuo, Logia)", Font(bold=True)),
        ("Après chaque paiement validé : onglet « Facture » de la branche, cases jaunes, articles, puis impression A5 ou PDF.", None),
        ("Le tableau des paiements (outils-paiement) crée aussi une facture PDF automatique à chaque statut « Validé ».", None),
        ("", None),
        ("Prix", Font(bold=True)),
        ("Onglet « Grille » : prix en bleu modifiables. Un article absent de la liste peut être tapé à la main, avec son prix.", None),
        ("Numérotation : DEV-V-001, DEV-L-001 ; FAC-D-0001, FAC-V-0001, FAC-L-0001 (augmenter le numéro à chaque document).", None),
    ]
    for i, (t, police) in enumerate(textes, 1):
        c = ws.cell(i, 1, t)
        c.alignment = Alignment(wrap_text=True)
        if police:
            c.font = police
    ws.sheet_view.showGridLines = False


def main():
    wb = Workbook()
    feuille_grille(wb)
    for branche in ("Visuo", "Logia"):
        feuille_devis(wb, branche)
    for branche in ("DEX", "Visuo", "Logia"):
        feuille_facture(wb, branche)
    feuille_aide(wb)
    wb.active = 1  # Devis Visuo à l'ouverture
    wb.save(SORTIE)
    for tmp in SORTIE.parent.glob(".tmp_*.png"):
        tmp.unlink()
    print("Classeur créé :", SORTIE)


if __name__ == "__main__":
    main()
