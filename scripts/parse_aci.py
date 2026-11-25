import re, json, sys
src, out = sys.argv[1], sys.argv[2]
lines = open(src, encoding='utf-8').read().replace('\f', '\n').split('\n')

def is_noise(l):
    s = l.strip()
    return (not s or s.startswith('ARANCEL CENTROAMERICANO DE IMPORTACI') or s.startswith('Documento elaborado')
            or s.startswith('Prohibida su reproducci') or re.fullmatch(r'\d{1,3}', s) is not None)

TABLE_HDR = re.compile(r'^\s*(INCISO\s+COD|ARANCELARIO\s+ADIC|DESCRIPCI[ÓO]N SAC\s+SAC)')
SEC = re.compile(r'^\s{20,}SECCI[ÓO]N\s+([IVXL]+)\s*$')
CAP = re.compile(r'^\s{20,}CAP[ÍI]TULO\s+(\d+)\s*$')
CODE = re.compile(r'^(\d{2}\.\d{2}|\d{4}\.\d{1,2}(?:\.\d{2}\.\d{2})?)(?=\s|$)')
ROMAN = {'I':1,'V':5,'X':10,'L':50}
def roman(s):
    t=0
    for i,c in enumerate(s):
        v=ROMAN[c]; t += -v if i+1<len(s) and ROMAN[s[i+1]]>v else v
    return t

# start after index: first SECCION I occurring after line 400
start = next(i for i,l in enumerate(lines) if i>400 and SEC.match(l) and SEC.match(l).group(1)=='I')
sections, chapters, entries = [], [], []
cur_sec = cur_cap = None
mode = None  # 'secnotes' | 'capnotes' | 'table'
buf = []
pending = []   # orphan desc lines
prev = None    # previous code entry dict
title_lines = []

def flush_notes():
    global buf
    text = '\n'.join(l.rstrip() for l in buf).strip('\n')
    # dedent
    ls = text.split('\n')
    ind = min((len(x)-len(x.lstrip()) for x in ls if x.strip()), default=0)
    text = '\n'.join(x[ind:] for x in ls)
    text = re.sub(r'\n{3,}', '\n\n', text).strip()
    buf = []
    return text

def close_table():
    global pending, prev
    if prev is not None and pending:
        prev['desc_lines'] += pending[:prev['above']]
    pending, prev = [], None

i = start
while i < len(lines):
    l = lines[i]
    m = SEC.match(l); c = CAP.match(l)
    if m:
        if mode == 'table': close_table()
        elif mode in ('secnotes','capnotes'):
            t = flush_notes()
            (sections[-1] if mode=='secnotes' else chapters[-1])['notes'] = t
        n = roman(m.group(1))
        # title: next non-empty lines until blank
        j = i+1; tl=[]
        while j < len(lines) and not lines[j].strip(): j+=1
        while j < len(lines) and lines[j].strip() and not lines[j].strip().startswith('NOTA'):
            tl.append(lines[j].strip()); j+=1
        cur_sec = {'n': n, 'title': ' '.join(tl), 'notes': ''}
        sections.append(cur_sec); mode='secnotes'; buf=[]; i=j; continue
    if c:
        if mode == 'table': close_table()
        elif mode in ('secnotes','capnotes'):
            t = flush_notes()
            (sections[-1] if mode=='secnotes' else chapters[-1])['notes'] = t
        n = int(c.group(1))
        j = i+1; tl=[]
        while j < len(lines) and not lines[j].strip(): j+=1
        while j < len(lines) and lines[j].strip() and not lines[j].strip().startswith('NOTA'):
            tl.append(lines[j].strip()); j+=1
        cur_cap = {'n': n, 'section': cur_sec['n'], 'title': ' '.join(tl), 'notes': ''}
        chapters.append(cur_cap); mode='capnotes'; buf=[]; i=j; continue
    if TABLE_HDR.match(l):
        if mode in ('secnotes','capnotes'):
            t = flush_notes()
            (sections[-1] if mode=='secnotes' else chapters[-1])['notes'] = t
            mode='table'
        i += 1; continue
    if is_noise(l):
        i += 1; continue
    if mode in ('secnotes','capnotes'):
        buf.append(l); i+=1; continue
    if mode == 'table':
        cm = CODE.match(l)
        if cm:
            code = cm.group(1)
            rest = l[cm.end():]
            adic = None
            am = re.match(r'\s+(\d{4})(?=\s)', rest)
            if am and len(rest) - len(rest.lstrip()) > 8:
                adic = am.group(1); rest = rest[am.end():]
            parts = [p for p in re.split(r'\s{2,}', rest.strip()) if p]
            # trailing rate tokens
            rates = []
            while parts and re.fullmatch(r'(\d+(\.\d+)?|--|II|[A-Z]{1,2})', parts[-1].split()[-1] if parts[-1] else ''):
                toks = parts[-1].split()
                if all(re.fullmatch(r'(\d+(\.\d+)?|--|II)', t) for t in toks):
                    rates = toks + rates; parts.pop()
                else:
                    break
            desc = ' '.join(parts).strip()
            e = {'code': code, 'adic': adic, 'desc_lines': [], 'above': 0, 'rates': rates, 'chapter': cur_cap['n']}
            # assign pending
            if prev is not None:
                k = min(prev['above'], len(pending))
                prev['desc_lines'] += pending[:k]
                rem = pending[k:]
            else:
                rem = pending
            e['desc_lines'] = rem + ([desc] if desc else [])
            e['above'] = len(rem)
            pending = []
            entries.append(e); prev = e
        else:
            s = l.strip()
            pending.append(s)
        i += 1; continue
    i += 1
if mode == 'table': close_table()

out_entries = []
for e in entries:
    d = re.sub(r'\s+', ' ', ' '.join(e['desc_lines'])).strip()
    d = re.sub(r'(\w)- (\w)', r'\1\2', d) if False else d
    out_entries.append({'code': e['code'], 'adic': e['adic'], 'desc': d, 'dai': e['rates'][0] if e['rates'] else None, 'chapter': e['chapter']})
json.dump({'sections': sections, 'chapters': chapters, 'entries': out_entries}, open(out,'w',encoding='utf-8'), ensure_ascii=False, indent=0)
print(len(sections), 'sections', len(chapters), 'chapters', len(out_entries), 'entries')
