"""Génère l'exemple de réalisation Logia « Suivi des contrats et documents » (Excel, compatible Google Sheets).

Modèle de démonstration : ni offert ni publié.
Usage : python3 generer_contrats.py  ->  Suivi-des-contrats-DWTS.xlsx
"""
from datetime import date
from pathlib import Path
from openpyxl import Workbook
from openpyxl.formatting.rule import FormulaRule
from openpyxl.styles import Font
from openpyxl.worksheet.datavalidation import DataValidation
from base_logia import *

SORTIE = Path(__file__).with_name('Suivi-des-contrats-DWTS.xlsx')
NB = 200
TYPES = ['Bail', 'Fournisseur', 'Client', 'Assurance', 'Travail', 'Prestation de service', 'Autre']

wb = Workbook()
menu(wb, 'Suivi des contrats et documents', [
    ('Contrats', "Listez vos contrats avec leurs dates. L'état (en cours, à renouveler, expiré) se met seul à jour chaque jour."),
    ('Tableau de bord', 'Les contrats à renouveler bientôt et la somme engagée.'),
    ('Paramètres', "Nom de l'entreprise et nombre de jours avant la fin pour être prévenu."),
])
pa, (ENT, ALERTE) = parametres(wb, [("Nom de l'entreprise", 'Mon entreprise'), ('Prévenir X jours avant la fin', 30)])

ct = wb.create_sheet('Contrats', 1)
bandeau(ct, 'Contrats', 11)
ct['A1'] = f'={ENT}&" · Suivi des contrats"'
retour_menu(ct, 1)
T = ['N°', 'Titre du contrat', 'Type', 'Partenaire', 'Date de début', 'Date de fin', 'Montant', 'Jours restants', 'État', 'Lien du document', 'Remarques']
entetes(ct, 4, T, [8, 34, 20, 26, 14, 14, 14, 12, 16, 30, 26])
exemples = [
    ('Bail du magasin', 'Bail', 'M. Ondo', date(2025, 1, 1), date(2027, 12, 31), 3600000, 'Loyer 300 000 / mois'),
    ('Assurance incendie', 'Assurance', 'Assurances Gabon', date(2026, 1, 15), date(2026, 11, 20), 240000, 'À renouveler'),
    ('Fourniture de boissons', 'Fournisseur', 'Sogapro', date(2025, 6, 1), date(2026, 5, 31), 1500000, ''),
    ('Contrat de maintenance informatique', 'Prestation de service', 'Logia (DWTS)', date(2026, 3, 1), date(2027, 2, 28), 600000, ''),
]
for i in range(NB):
    r = 5 + i
    ct.cell(r, 1, f'=IF(B{r}="","","K"&TEXT(ROW()-4,"000"))')
    ct.cell(r, 8, f'=IF(F{r}="","",F{r}-TODAY())')
    ct.cell(r, 9, f'=IF(F{r}="","",IF(F{r}<TODAY(),"Expiré",IF(F{r}-TODAY()<={ALERTE},"À renouveler","En cours")))')
    if i < len(exemples):
        t, ty, p, d, f, m, rem = exemples[i]
        for col, v in [(2, t), (3, ty), (4, p), (5, d), (6, f), (7, m), (11, rem)]:
            ct.cell(r, col, v)
    for col in (5, 6):
        ct.cell(r, col).number_format = 'dd/mm/yyyy'
    ct.cell(r, 7).number_format = '# ##0'
corps(ct, 5, NB, 11, calcule=(1, 8, 9), centre=(1, 5, 6, 8, 9))
dv = DataValidation(type='list', formula1='"' + ','.join(TYPES) + '"', allow_blank=True)
ct.add_data_validation(dv); dv.add(f'C5:C{4 + NB}')
zone = f'I5:I{4 + NB}'
for s, (bg, fg) in {'En cours': ('D1F7E0', '166534'), 'À renouveler': ('FEF3C7', '92400E'), 'Expiré': ('FEE2E2', 'B91C1C')}.items():
    ct.conditional_formatting.add(zone, FormulaRule(formula=[f'I5="{s}"'], fill=fond(bg), font=Font(bold=True, color=fg)))
ct.auto_filter.ref = f'A4:K{4 + NB}'
ct.freeze_panes = 'C5'

tb = wb.create_sheet('Tableau de bord', 2)
bandeau(tb, 'Tableau de bord', 5)
retour_menu(tb, 1)
for c in 'ABCDE':
    tb.column_dimensions[c].width = 22
p = lambda col: f'Contrats!{col}5:{col}{4 + NB}'
carte(tb, 4, 1, 'Contrats au total', f'=COUNTA({p("B")})')
carte(tb, 4, 2, 'En cours', f'=COUNTIF({p("I")},"En cours")')
carte(tb, 4, 3, 'À renouveler', f'=COUNTIF({p("I")},"À renouveler")')
carte(tb, 4, 4, 'Expirés', f'=COUNTIF({p("I")},"Expiré")')
carte(tb, 4, 5, 'Montant des contrats en cours', f'=SUMIF({p("I")},"En cours",{p("G")})+SUMIF({p("I")},"À renouveler",{p("G")})', '# ##0')

wb.save(SORTIE)
print(SORTIE)
