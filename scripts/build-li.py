"""Import reviewed Li (2021) entries without changing existing reaction IDs.

Usage: python scripts/build-li.py /path/to/li.pdf [--prepare-ocr | --mask-only]
Requires pymupdf and Pillow. Run from the repository root.
The PDF and OCR intermediates stay in .book-work; only selected figures ship.
"""
import hashlib
import json
import math
import re
import sys
import unicodedata
from pathlib import Path

import pymupdf
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
def read(path): return json.loads((ROOT/path).read_text())
def write(path, value): (ROOT/path).write_text(json.dumps(value, ensure_ascii=False, indent=2)+'\n')
def jsdata(path, declaration):
    return json.loads((ROOT/path).read_text().split('const '+declaration+' = ')[1].strip().rstrip(';'))
def normal(text):
    return ''.join(c for c in unicodedata.normalize('NFKD', text).lower() if not unicodedata.combining(c))
def tokens(text): return re.findall(r'[^\W\d_]+', normal(text))

entries = read('scripts/li-entries.json')
original = jsdata('assets/reactions.js', 'reactionCatalog')
original_masks = read('scripts/flashcard-masks.json')
references = read('scripts/flashcard-name-references.json')
known = set().union(*(f['terms'] for f in original_masks.values()), references['additionalNames'])
known.update(tokens('Bucherer Bergs Chodkiewicz Catellani Chapman Friedländer Gewald Gould Jacobs Kocienski Lawesson Markovnikov Newman Kwart Parham Braun Jackson Sanger Schönberg Lautens Smile'))
abbreviations = set(references['abbreviations'])
# Acronyms are case-sensitive: BR is a named reaction; Br is bromine.
def identifying(text):
    return bool(known.intersection(tokens(text)) or abbreviations.intersection(re.findall(r'[^\W\d_]+', text)))
doc = pymupdf.open(sys.argv[1])
render = '--mask-only' not in sys.argv
scale = 3
for directory in ['assets/li', 'assets/flashcards', '.book-work']:
    (ROOT/directory).mkdir(exist_ok=True)
ocr_path = ROOT/'.book-work/li-diagram-ocr.json'
ocr = json.loads(ocr_path.read_text()) if ocr_path.exists() else {}
if '--prepare-ocr' not in sys.argv:
    missing = [e['id'] for e in entries if e['status']=='new' and e['id'] not in ocr]
    if missing: sys.exit('Source OCR required. Run with --prepare-ocr, then scripts/ocr-li-figures.swift, then --mask-only.')
prior = read('scripts/li-flashcard-masks.json') if (ROOT/'scripts/li-flashcard-masks.json').exists() else {}
catalog, book, sections, figures, coverage, masks, jobs = [], {}, {}, {}, {}, {}, []
starts = sorted(set(e['printedPage'] for e in entries) | {586})

def lines(page):
    result = []
    for block in page.get_text('dict')['blocks']:
        for line in block.get('lines', []):
            text = ''.join(s['text'] for s in line['spans']).strip()
            if text: result.append((text, list(line['bbox'])))
    return sorted(result, key=lambda row: (row[1][1], row[1][0]))

def figure(id, kind, printed, rect):
    filename = f'assets/li/{id}-{kind}.png'
    pg = doc[printed+18]
    if render:
        pg.get_pixmap(matrix=pymupdf.Matrix(scale, scale), clip=pymupdf.Rect(rect), alpha=False).save(ROOT/filename)
    jobs.append(dict(id=id, type=kind, printedPage=printed, pdfPage=printed+19, crop=rect, scale=scale, image=filename))
    return dict(image=filename, printedPage=printed, pdfPage=printed+19, book='li', caption={'reaction':'Reaction & conditions', 'mechanism':'Mechanism', 'outline':'Outline / history'}.get(kind, 'Synthetic applications'))

for entry in entries:
    id, printed = entry['id'], entry['printedPage']
    covered = coverage.setdefault(id, {'pages': [], 'names': []})
    if printed not in covered['pages']: covered['pages'].append(printed)
    covered['names'].append(entry['name'])
    if entry['status'] != 'new': continue
    end = next(p for p in starts if p>printed)-1
    pg = doc[printed+18]
    text_lines = lines(pg)
    summary = entry['summary']
    catalog.append(dict(id=id, name=entry['name'], bookName=entry['name'], summary=summary,
        question=summary+' Identify the named reaction.', equation=summary, explanation=summary,
        reagents='', difficulty='Book entry', sourceOverview=True, sourceBook='li',
        printedPage=printed, categories=entry['categories'], category=entry['categories'][0],
        appendixPages=[], appendixSummary=None))
    reaction = figure(id, 'reaction', printed, entry['reactionCrop'])
    if printed in [282,284,286]: reaction['caption'] = 'Reaction & conditions (book example)'
    sections[id] = {'reaction': reaction}
    examples = [b[1] for t,b in text_lines if t.startswith(('Example ', 'General examples:'))]
    if entry.get('hasOutline', True):
        bottom = min(entry['reactionCrop'][1]-5, min(examples, default=600)-4)
        # The introductory text precedes the first figure; a few sections also
        # include a 'General scheme' label, which is retained as source content.
        if bottom>90: sections[id]['outline'] = figure(id, 'outline', printed, [50,82,390,bottom])
    source = {'pages':[printed,end] if end!=printed else [printed], 'book':'li', 'reaction':reaction, 'applications':[]}
    if entry['mechanismCrop']:
        source['mechanism'] = figure(id, 'mechanism', printed, entry['mechanismCrop'])
    # Keep every source example up to the reference list. Absent sections are
    # absent metadata, not placeholder tabs or invented mechanism descriptions.
    started = False
    for number in range(printed,end+1):
        page_lines = lines(doc[number+18])
        refs = [b[1] for t,b in page_lines if t=='References']
        top = min([b[1] for t,b in page_lines if t.startswith(('Example ', 'General examples:', 'More complex products:'))], default=None)
        if number == printed and top is None: continue
        if top is not None: started=True
        if not started: continue
        top = top if number==printed else 60
        bottom = min(refs, default=603)-4
        if bottom-top>25:
            source['applications'].append(figure(id, f'applications-{number}', number, [50,top-2,390,bottom]))
        if refs: break
    book[id] = source

    image = Image.open(ROOT/reaction['image']).convert('RGB')
    width, height = image.size
    rect = entry['reactionCrop']
    # PyMuPDF raster bounds round outwards; use the same device origin.
    origin_x, origin_y = math.floor(rect[0]*scale), math.floor(rect[1]*scale)
    areas = []
    def add(label, box, origin):
        x0,y0,x1,y1 = box
        x=max(0,math.floor(x0)-3); y=max(0,math.floor(y0)-3)
        right=min(width,math.ceil(x1)+3); bottom=min(height,math.ceil(y1)+3)
        if right>x and bottom>y: areas.append(dict(text=label, rect=[x,y,right-x,bottom-y], detection=origin))
    for word in pg.get_text('words', clip=pymupdf.Rect(rect)):
        if identifying(word[4]):
            add(word[4], [word[0]*scale-origin_x,word[1]*scale-origin_y,word[2]*scale-origin_x,word[3]*scale-origin_y], 'pdf')
    for word in ocr.get(id, {}).get('words', []):
        if identifying(word['text']):
            x,y,w,h = word['rect']
            add(word['text'], [x*width,y*height,(x+w)*width,(y+h)*height], 'ocr')
    draw = ImageDraw.Draw(image)
    for area in areas:
        x,y,w,h=area['rect']; draw.rectangle((x,y,x+w-1,y+h-1), fill='white')
    digest = hashlib.sha256(image.tobytes()).hexdigest()[:12]
    output = f'assets/flashcards/li-{printed:03}-{digest}.png'
    if areas: image.save(ROOT/output)
    else: (ROOT/output).write_bytes((ROOT/reaction['image']).read_bytes())
    masks[id] = dict(source=reaction['image'], image=output, width=width, height=height,
        terms=sorted(known), masks=areas, ocrAudited=id in ocr)
    figures[id] = dict(reaction, image=output)

catalog.sort(key=lambda r: normal(r['name']))
write('scripts/li-figures.json', jobs)
write('scripts/li-flashcard-masks.json', masks)
data = {'liCatalog':catalog, 'liBookReactions':book, 'liBookSections':sections,
        'liFlashcardFigures':figures, 'liCoverage':coverage}
(ROOT/'assets/li-data.js').write_text('// Generated by scripts/build-li.py from the supplied Li (2021) book.\n'+
    '\n'.join('const '+key+' = '+json.dumps(value, ensure_ascii=False, indent=2)+';' for key,value in data.items())+'\n')
current = {f['image'] for f in figures.values()}
for old in prior.values():
    if old['image'] not in current and re.fullmatch(r'assets/flashcards/li-\d+-[a-f0-9]+\.png',old['image']):
        (ROOT/old['image']).unlink(missing_ok=True)
print(f'Added {len(catalog)} entries; {len(coverage)} Li-covered reaction IDs; {len(jobs)} figures; '+
      f"{sum(len(f['masks']) for f in masks.values())} whiteouts; {sum(f['ocrAudited'] for f in masks.values())} OCR-audited prompts.")
