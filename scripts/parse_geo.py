import pdfplumber, re, json, sys
src, out = sys.argv[1], sys.argv[2]
CODE = re.compile(r'^(\d{2}\.\d{2}|\d{4}(?:\.\d{1,2}){1,3})$')
pdf = pdfplumber.open(src)
rows = []  # sequence of line dicts across all table pages
for pn in range(len(pdf.pages)):
    p = pdf.pages[pn]
    ws = p.extract_words(keep_blank_chars=False, use_text_flow=False)
    p.flush_cache()
    try: p.close()
    except Exception: pass
    ins = [w for w in ws if w['text'] == 'INCISO' and w['x0'] < 100]
    if not ins:
        continue
    t0 = ins[0]['top']
    hdr = max(w['bottom'] for w in ws if w['text'] in ('ARANCELARIO', 'ADIC.') and t0 - 2 <= w['top'] < t0 + 20)
    body = [w for w in ws if w['top'] > hdr + 2 and w['top'] < 745]
    body.sort(key=lambda w: (round(w['top']), w['x0']))
    lines = []
    for w in body:
        if lines and abs(lines[-1]['top'] - w['top']) < 2.5:
            lines[-1]['ws'].append(w)
        else:
            lines.append({'top': w['top'], 'ws': [w]})
    for L in lines:
        code = adic = None; desc = []; rates = []
        for w in sorted(L['ws'], key=lambda w: w['x0']):
            x = w['x0']; t = w['text']
            if x < 100 and CODE.match(t): code = t
            elif 100 <= x < 140 and re.fullmatch(r'\d{4}', t): adic = t
            elif 140 <= x < 262: desc.append(t)
            elif x >= 262: rates.append(t)
            else: desc.append(t)
        rows.append({'page': pn + 1, 'code': code, 'adic': adic, 'desc': ' '.join(desc), 'rates': rates})

entries = []; pending = []; prev = None; prev_page = None
for r in rows:
    if r['page'] != prev_page and prev is not None:
        # close previous page: leftover pending belong to prev (below lines)
        prev['lines'] += pending[:prev['above']]
        pending = pending[prev['above']:]
        prev = None
    prev_page = r['page']
    if r['code']:
        if prev is not None:
            k = min(prev['above'], len(pending)); prev['lines'] += pending[:k]; rem = pending[k:]
        else:
            rem = pending
        e = {'code': r['code'], 'adic': r['adic'], 'lines': rem + ([r['desc']] if r['desc'] else []), 'above': len(rem),
             'dai': (r['rates'][0] if r['rates'] else None), 'page': r['page']}
        pending = []; entries.append(e); prev = e
    elif r['desc']:
        pending.append(r['desc'])
if prev is not None: prev['lines'] += pending[:prev['above']]
res = []
seen = set()
for e in entries:
    if e['adic']: continue
    if e['code'] in seen: continue
    seen.add(e['code'])
    d = re.sub(r'\s+', ' ', ' '.join(e['lines'])).strip()
    res.append({'code': e['code'], 'desc': d, 'dai': e['dai'], 'page': e['page']})
json.dump(res, open(out, 'w', encoding='utf-8'), ensure_ascii=False)
print(len(res), 'entries')
