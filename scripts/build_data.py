import json, re
G = json.load(open('data-src/geo.json'))
R = json.load(open('data-src/raw.json'))
txt = open('data-src/aci.txt', encoding='utf-8').read()
raw_by = {e['code']: e for e in R['entries'] if not e['adic']}
geo = {e['code']: e for e in G}
def bad(d): return (not d) or d[:1].islower() or d[:1] in '(,' or re.search(r'(^|\s)\d{4}\.\d', d)
fixed = 0
items = {}
for code, e in geo.items():
    d = e['desc']
    if bad(d) and code in raw_by and not bad(raw_by[code]['desc']):
        d = raw_by[code]['desc']; fixed += 1
    items[code] = [code, d, e['dai']]
for code, e in raw_by.items():
    if code not in items:
        items[code] = [code, e['desc'], e['dai']]
def key(c):
    digits = c.replace('.', '')
    return digits.ljust(10, '0') + str(len(c)).zfill(2)
order = sorted(items.values(), key=lambda x: (x[0].replace('.', '').ljust(10, '0'), len(x[0])))
# chapters: drop false ones, keep longest notes
chaps = {}
for c in R['chapters']:
    if c['title'].startswith('-') or re.search(r'\d{4}\.\d', c['title']): continue
    if c['n'] not in chaps or len(c['notes']) > len(chaps[c['n']]['notes']):
        chaps[c['n']] = c
# section of each chapter by order in raw
secs = [{'n': s['n'], 'title': s['title'].strip(), 'notes': s['notes']} for s in R['sections']]
chapters = [{'n': c['n'], 's': c['section'], 'title': c['title'].strip(), 'notes': c['notes']} for c in sorted(chaps.values(), key=lambda c: c['n'])]
# reglas generales
m = re.search(r'C\.\s+REGLAS GENERALES.*?(?=\n\s*\d+\s*\n)', txt, re.S)
a = txt.find('C.        REGLAS GENERALES'); b = txt.find('INDICE DE MATERIAS')
rg = txt[a:b]
rg = '\n'.join(l for l in rg.split('\n') if not (l.strip().startswith('Documento elaborado') or l.strip().startswith('Prohibida') or l.strip().startswith('ARANCEL CENTROAMERICANO') or re.fullmatch(r'\s*\d+\s*', l)))
rg = re.sub(r'\n{3,}', '\n\n', rg).strip()
out = {'fuente': 'Arancel Centroamericano de Importación (SAC, VII Enmienda), versión 2023', 'reglas': rg,
       'secciones': secs, 'capitulos': chapters, 'items': order}
json.dump(out, open('public/arancel.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('items', len(order), 'incisos', sum(1 for x in order if len(x[0]) == 13), 'fixed', fixed, 'chapters', len(chapters), 'sections', len(secs))
print('sospechosas restantes', sum(1 for x in order if bad(x[1])))
