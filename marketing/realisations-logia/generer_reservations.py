"""Génère l'exemple de réalisation Logia « Réservation de tables » (Excel, compatible Google Sheets).

Modèle de démonstration : ni offert ni publié.
Usage : python3 generer_reservations.py  ->  Reservation-de-tables-DWTS.xlsx
"""
from datetime import date, time
from pathlib import Path
from openpyxl import Workbook
from openpyxl.formatting.rule import FormulaRule
from openpyxl.styles import Alignment, Font
from openpyxl.worksheet.datavalidation import DataValidation
from base_logia import *

SORTIE = Path(__file__).with_name('Reservation-de-tables-DWTS.xlsx')
NB_TABLES, NB_RES = 20, 500
HEURES = [f'{h:02d}:{m:02d}' for h in range(11, 23) for m in (0, 30)] + ['23:00']
STATUTS = ['Confirmée', 'Arrivée', 'Annulée', 'Absente']

wb = Workbook()
menu(wb, 'Réservation de tables', [
    ('Tables', 'Listez vos tables (jusqu\'à 20) avec leur nombre de places.'),
    ('Réservations', "Notez chaque réservation. Le logiciel signale tout seul une table déjà prise ou trop petite."),
    ('Planning du jour', 'Choisissez une date : vous voyez toutes les tables et tous les créneaux, avec le nom du client.'),
    ('Paramètres', "Nom du restaurant."),
])
pa, (ENT,) = parametres(wb, [('Nom du restaurant', 'Mon restaurant')])

# ---------- Tables ----------
ta = wb.create_sheet('Tables', 1)
bandeau(ta, 'Tables', 3)
retour_menu(ta, 1)
entetes(ta, 4, ['Table', 'Places', 'Zone'], [14, 10, 20])
for i, (n, pl, z) in enumerate([('Table 1', 2, 'Salle'), ('Table 2', 4, 'Salle'), ('Table 3', 4, 'Salle'), ('Table 4', 6, 'Terrasse'), ('Table 5', 8, 'Terrasse')]):
    ta.cell(5 + i, 1, n); ta.cell(5 + i, 2, pl); ta.cell(5 + i, 3, z)
corps(ta, 5, NB_TABLES, 3, centre=(2,))
TAB = f'Tables!$A$5:$A${4 + NB_TABLES}'

# ---------- Réservations ----------
rs = wb.create_sheet('Réservations', 2)
bandeau(rs, 'Réservations', 10)
rs['A1'] = f'={ENT}&" · Réservations"'
retour_menu(rs, 1)
entetes(rs, 4, ['Date', 'Heure', 'Nom du client', 'Téléphone', 'Personnes', 'Table', 'Statut', 'Remarques', 'Contrôle', 'Clé'],
        [14, 10, 26, 16, 11, 14, 13, 28, 20, 4])
rs.column_dimensions['J'].hidden = True
exemples = [
    (date(2026, 10, 30), '19:00', 'Armel Ndong', '062 98 76 54', 4, 'Table 2', 'Confirmée', 'Anniversaire'),
    (date(2026, 10, 30), '20:00', 'Sandrine Mba', '077 45 67 89', 2, 'Table 1', 'Confirmée', ''),
    (date(2026, 10, 30), '19:00', 'Patrick Moussavou', '066 12 34 56', 6, 'Table 4', 'Confirmée', 'Terrasse'),
    (date(2026, 10, 30), '21:30', 'Marie Nzé', '074 11 22 33', 3, 'Table 1', 'Confirmée', 'Exemple : table trop petite'),
]
for i in range(NB_RES):
    r = 5 + i
    # clé = date|table|heure, vide si la réservation est annulée
    rs.cell(r, 10, f'=IF(OR(A{r}="",F{r}="",G{r}="Annulée"),"",TEXT(A{r},"yyyymmdd")&"|"&F{r}&"|"&B{r})')
    rs.cell(r, 9, f'=IF(OR(A{r}="",F{r}=""),"",IF(IFERROR(VLOOKUP(F{r},Tables!$A$5:$B${4 + NB_TABLES},2,FALSE),0)<N(E{r}),"Table trop petite",IF(COUNTIF($J$5:$J${4 + NB_RES},J{r})>1,"Table déjà prise","OK")))')
    if i < len(exemples):
        d, h, n, t, pe, tb_, st, rem = exemples[i]
        for col, v in [(1, d), (2, h), (3, n), (4, t), (5, pe), (6, tb_), (7, st), (8, rem)]:
            rs.cell(r, col, v)
    rs.cell(r, 1).number_format = 'dd/mm/yyyy'
corps(rs, 5, NB_RES, 9, calcule=(9,), centre=(1, 2, 5, 6, 7, 9))
for formule, zone in [(f'"{",".join(HEURES)}"', f'B5:B{4 + NB_RES}'), (f'={TAB}', f'F5:F{4 + NB_RES}'),
                      ('"' + ','.join(STATUTS) + '"', f'G5:G{4 + NB_RES}')]:
    dv = DataValidation(type='list', formula1=formule, allow_blank=True)
    rs.add_data_validation(dv); dv.add(zone)
# la liste des heures dépasse 255 caractères : on la place sur la feuille Paramètres
hs = pa
hs.cell(6, 1, 'Créneaux').font = Font(name='Arial', bold=True, color=NAVY)
for i, h in enumerate(HEURES):
    hs.cell(7 + i, 1, h)
rs.data_validations.dataValidation[0].formula1 = f"='Paramètres'!$A$7:$A${6 + len(HEURES)}"
rs.conditional_formatting.add(f'I5:I{4 + NB_RES}', FormulaRule(formula=['I5="OK"'], font=Font(bold=True, color='166534')))
rs.conditional_formatting.add(f'I5:I{4 + NB_RES}', FormulaRule(formula=['AND(I5<>"",I5<>"OK")'], fill=fond('FEE2E2'), font=Font(bold=True, color='B91C1C')))
rs.conditional_formatting.add(f'G5:G{4 + NB_RES}', FormulaRule(formula=['G5="Annulée"'], font=Font(color='999999', strike=True)))
rs.auto_filter.ref = f'A4:I{4 + NB_RES}'
rs.freeze_panes = 'D5'

# ---------- Planning du jour ----------
pl = wb.create_sheet('Planning du jour', 3)
LARG = 1 + len(HEURES)
bandeau(pl, 'Planning du jour', LARG)
retour_menu(pl, 1)
pl.cell(3, 4, 'Date :').font = Font(name='Arial', bold=True, color=NAVY)
pl.cell(3, 5, date(2026, 10, 30)).number_format = 'dd/mm/yyyy'
pl.cell(3, 5).fill = fond(SAISIE); pl.cell(3, 5).border = CADRE; pl.cell(3, 5).font = Font(name='Arial', bold=True)
pl.merge_cells(start_row=3, start_column=5, end_row=3, end_column=6)
pl.column_dimensions['A'].width = 14
for c, h in enumerate(HEURES, start=2):
    x = pl.cell(5, c, h)
    x.font = Font(name='Arial', bold=True, color='FFFFFF', size=9); x.fill = fond(BLEU); x.alignment = CENTRE; x.border = CADRE
    pl.column_dimensions[L(c)].width = 11
pl.cell(5, 1, 'Table').font = Font(name='Arial', bold=True, color='FFFFFF')
pl.cell(5, 1).fill = fond(BLEU); pl.cell(5, 1).alignment = CENTRE; pl.cell(5, 1).border = CADRE
for i in range(NB_TABLES):
    r = 6 + i
    pl.cell(r, 1, f'=IF(Tables!A{5 + i}="","",Tables!A{5 + i})')
    for c in range(2, LARG + 1):
        h = f'{L(c)}$5'
        pl.cell(r, c, f'=IF($A{r}="","",IFERROR(INDEX(Réservations!$C$5:$C${4 + NB_RES},MATCH(TEXT($E$3,"yyyymmdd")&"|"&$A{r}&"|"&{h},Réservations!$J$5:$J${4 + NB_RES},0)),""))')
        pl.cell(r, c).alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
        pl.cell(r, c).font = Font(name='Arial', size=8, bold=True)
        pl.cell(r, c).border = CADRE
    pl.cell(r, 1).font = Font(name='Arial', bold=True)
    pl.cell(r, 1).border = CADRE
    pl.row_dimensions[r].height = 28
pl.conditional_formatting.add(f'B6:{L(LARG)}{5 + NB_TABLES}', FormulaRule(formula=['B6<>""'], fill=fond('D1F7E0'), font=Font(bold=True, color='166534')))
pl.freeze_panes = 'B6'

wb.save(SORTIE)
print(SORTIE)
