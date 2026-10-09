"""Build browser data and the PDFKit crop manifest from locally extracted text.

Usage: python3 scripts/build-book.py
The source PDF and intermediate extracts stay in the ignored .book-work folder.
"""
import json
import re
import unicodedata
import ast
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
def read(path):
    return json.loads((ROOT / path).read_text())
def write(path, value):
    (ROOT / path).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
def clean(s):
    return re.sub(r'\s+', ' ', s).strip()
def slug(s):
    return re.sub(r'[^a-z0-9]+', '-', unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()).strip('-')

pages = {p['page']:p['text'] for p in read('.book-work/source-pages.json')['pages']}
layout = read('.book-work/appendix-layout.json')
category_rows = []
category_names = []
for page in layout:
    cols = page['columns']
    headers = []
    for line in sorted(cols[0], key=lambda x:-x['y']):
        t = line['text'].strip()
        if t in ['REACTION', 'CATEGORY', 'ANRORC'] or not t or not t.isupper():
            continue
        if headers and headers[-1]['lastY'] - line['y'] < 12:
            headers[-1]['text'] += (' ' if not headers[-1]['text'].endswith('-') else '') + t
            headers[-1]['lastY'] = line['y']
        else:
            headers.append(dict(text=t, y=line['y'], lastY=line['y']))
    for h in headers:
        h['text'] = h['text'].replace('REARRANGE-MENTS', 'REARRANGEMENTS').replace('CYCLO-AROMATIZATION', 'CYCLOAROMATIZATION')
        if h['text'] not in category_names:
            category_names.append(h['text'])
    refs = sorted([l for l in cols[3] if re.fullmatch(r'\d{1,3}', l['text'].strip())], key=lambda x:-x['y'])
    for i, ref in enumerate(refs):
        top, bottom = ref['y'] + 4, refs[i+1]['y'] + 4 if i+1<len(refs) else 0
        def cell(col):
            return clean(' '.join(l['text'] for l in sorted(cols[col], key=lambda x:-x['y']) if bottom < l['y'] <= top))
        name, description = cell(1), cell(2)
        candidates = [h for h in headers if h['y'] >= ref['y'] - 2]
        assert candidates, (page['page'], ref)
        category = candidates[-1]['text']
        printed = int(ref['text'])
        # Appendix errata: verified against the named chapter headings.
        if name.startswith('Lieben'): printed = 264
        if name.startswith('Ley'): printed = 262
        if name.startswith('Larock'): printed = 260
        category_rows.append(dict(name=name, description=description, category=slug(category), printedPage=printed, appendixPage=page['page']-52))

entries = []
for printed in range(2, 501, 2):
    text = pages[printed+52]
    before = text.split('(References')[0].splitlines()
    heading = []
    for line in reversed(before):
        if any(token in line for token in ['TEXT', 'TE EX', 'CONTENTS', 'PREVIOUS', 'NEXT REACTION', 'CO ON NT']) or line == 'Importance:': break
        heading.insert(0, line)
    title = clean(' '.join(heading))
    assert title and 'CONTENTS' not in title, (printed,title)
    entries.append(dict(printedPage=printed, title=title, rows=[r for r in category_rows if r['printedPage']==printed]))

write('.book-work/parsed-book.json', entries)
write('.book-work/appendix-rows.json', category_rows)
print('Chapters:', len(entries), 'Appendix memberships:',len(category_rows), 'Categories:',len(category_names))
print('Chapters not listed in appendix 8.3:', sum(not e['rows'] for e in entries))
assert [e['printedPage'] for e in entries if 'Mechanism:' not in pages[e['printedPage']+52]] == [32]

# Snapshot the original authored cards once so their IDs, bookmarks and prompts
# survive regeneration and the expansion of the catalog.
legacy_path = ROOT / 'scripts/legacy-reactions.json'
if not legacy_path.exists():
    app = (ROOT / 'assets/app.js').read_text()
    raw = app.split('const reactions = ',1)[1].split('.map(([id,',1)[0]
    fields = ['id','name','category','summary','question','reagents','equation','explanation','difficulty']
    write('scripts/legacy-reactions.json', [dict(zip(fields,r)) for r in ast.literal_eval(raw.rstrip(';\n'))])
    raw_book = (ROOT / 'assets/book-data.js').read_text().split('const bookReactions = ',1)[1].strip().rstrip(';')
    write('scripts/legacy-book.json', json.loads(raw_book))
    write('scripts/legacy-figures.json', read('scripts/book-figures.json'))
legacy = read('scripts/legacy-reactions.json')
book = read('scripts/legacy-book.json')
by_page = {b['pages'][0]:next(r for r in legacy if r['id']==id) for id,b in book.items() if id!='fischer'}
supplements = read('scripts/book-supplements.json')
catalog = []
jobs = read('scripts/legacy-figures.json')
for job in jobs: job['skipExisting'] = True

description_corrections = {
    26: 'Base-promoted [2,3]-sigmatropic rearrangement of allylic tertiary amines to give homoallylic secondary amines.',
    374: 'Zinc-mediated reaction of an α-halo ester with an aldehyde or ketone to afford a β-hydroxy ester.',
    388: 'Oxidation of silyl enol ethers with mCPBA to give α-hydroxy ketones or α-hydroxy aldehydes.',
    414: 'Formation of substituted quinolines from anilines and suitable three-carbon carbonyl precursors under acidic conditions.',
    426: 'Cycloaddition of ketenes with imines to form β-lactams; ketenes also undergo [2+2] cycloadditions with alkenes.',
    458: 'Pd-catalyzed allylation of nucleophiles using allylic substrates via π-allylpalladium complexes.'
}
for entry in entries:
    p = entry['printedPage']
    memberships = list(dict.fromkeys(r['category'] for r in entry['rows'])) or ['not-listed']
    name = entry['title'].title().replace('Mcmurry', 'McMurry').replace('Mccombie','McCombie').replace('Demayo','DeMayo').replace('Samp/Ramp','SAMP/RAMP').replace('Cbs','CBS').replace('Hwe','HWE').replace('’S','’s').replace("'S","'s")
    summary = description_corrections.get(p) or (entry['rows'][0]['description'] if entry['rows'] else supplements[str(p)])
    if p in by_page:
        r = dict(by_page[p])
    else:
        id = slug(name)
        # The overview preserves the full background, conditions and scheme;
        # chemical drawings are never reconstructed from lossy plain PDF text.
        r = dict(id=id, name=name, summary=summary, question=summary+(' Which guidelines are these?' if p==32 else ' Identify the named reaction.'),
                 reagents='', equation=summary, explanation=summary, difficulty='Book entry', sourceOverview=True)
        base = 'assets/book/'+id
        book[id] = dict(pages=[p,p+1],
            reaction=dict(image=base+'-reaction.png', printedPage=p, pdfPage=p+52, caption='Reaction scheme, background, reagents and conditions'),
            mechanism=dict(image=base+'-mechanism.png', printedPage=p, pdfPage=p+52, caption='Mechanism and commentary'),
            applications=[dict(image=base+'-applications.png', printedPage=p+1, pdfPage=p+53, caption='Synthetic applications')])
        jobs.extend([
            dict(page=p+52,file=base+'-reaction.png',region='overview',scale=2,skipExisting=True),
            dict(page=p+52,file=base+'-mechanism.png',region='mechanism',scale=2,skipExisting=True),
            dict(page=p+53,file=base+'-applications.png',crop=[0.11,0.093,0.78,0.882],scale=2,skipExisting=True)])
        if p == 32:
            # This chapter is a set of guidelines, not an individual mechanism.
            jobs[-3].pop('region')
            jobs[-3]['crop'] = [0.11,0.12,0.78,0.855]
            jobs.pop(-2)
            book[id]['mechanism'] = None
            book[id]['mechanismNote'] = 'Baldwin’s rules classify ring closures rather than describe a single reaction mechanism. The Reaction tab contains the book’s rules and stereoelectronic diagrams.'
    r.update(categories=memberships, category=memberships[0], printedPage=p, bookName=name,
             appendixPages=sorted(set(row['appendixPage'] for row in entry['rows'])))
    catalog.append(r)

extra = dict(next(r for r in legacy if r['id']=='fischer'))
extra.update(categories=['not-listed'], category='not-listed', appendixPages=[], supplemental=True)
catalog.append(extra)
catalog.sort(key=lambda r:r['name'].casefold())
categories = [dict(id=slug(n),name=n.capitalize().replace('c-c','C–C'),short=n.capitalize().replace('c-c','C–C')) for n in category_names]
categories.append(dict(id='not-listed', name='Not listed in appendix 8.3', short='Not listed in appendix 8.3'))
write('scripts/book-figures.json', jobs)
write('scripts/appendix-categories.json', category_rows)
(ROOT/'assets/reactions.js').write_text('// Generated by scripts/build-book.py. Appendix 8.3 categories retain overlapping memberships.\nconst bookCategories = '+json.dumps(categories,ensure_ascii=False,indent=2)+';\nconst reactionCatalog = '+json.dumps(catalog,ensure_ascii=False,indent=2)+';\n')
(ROOT/'assets/book-data.js').write_text('// Generated by scripts/build-book.py from the supplied book.\nconst bookReactions = '+json.dumps(book,ensure_ascii=False,indent=2)+';\n')
print('Generated',len(catalog),'cards and',len(jobs),'figure jobs.')
