"""Import the supplied Mundy, Ellerd & Favaloro (2005) PDF.

Usage: .book-work/venv/bin/python scripts/build-mundy.py /path/to/book.pdf [--prepare-ocr]
For the first build, prepare OCR, run scripts/ocr-mundy.swift, then build again.
Requires PyMuPDF and Pillow. Page 1 is PDF page 19 (offset 18).
Reviewed entries and crops live in mundy-entries.json and mundy-reagents.json.
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
def write(path, data): (ROOT/path).write_text(json.dumps(data, ensure_ascii=False, indent=2)+'\n')
def normal(text):
    return ''.join(c for c in unicodedata.normalize('NFKD', text).lower() if not unicodedata.combining(c))

doc = pymupdf.open(sys.argv[1])
assert len(doc)==900, 'Expected the supplied second edition, 900 PDF pages'
entries = read('scripts/mundy-entries.json')
reagent_entries = read('scripts/mundy-reagents.json')
new = [e for e in entries if e['status']=='new']
assert len({e['id'] for e in new})==len(new), 'Duplicate new reaction IDs'
for folder in ['assets/mundy', 'assets/reagents', 'assets/flashcards', '.book-work']:
    (ROOT/folder).mkdir(exist_ok=True)
if '--prepare-ocr' in sys.argv:
    jobs=[]
    for n in sorted({e['printedPage'] for e in new}):
        path=f'.book-work/mundy-ocr-page-{n}.png'
        doc[n+17].get_pixmap(matrix=pymupdf.Matrix(3,3)).save(ROOT/path)
        jobs.append({'page':n,'image':path})
    write('.book-work/mundy-ocr-jobs.json',jobs)
    print(f'Prepared {len(jobs)} scanned pages; run swift scripts/ocr-mundy.swift, then rebuild.')
    sys.exit()
ocr = read('.book-work/mundy-ocr.json')
assert all(str(e['printedPage']) in ocr for e in new), 'Run --prepare-ocr and scripts/ocr-mundy.swift first'
references = read('scripts/flashcard-name-references.json')
legacy_masks = read('scripts/flashcard-masks.json')
known = set().union(*(f['terms'] for f in legacy_masks.values()), references['additionalNames'])
# Chemical descriptions must remain readable in anonymous reaction prompts.
generic = set('reaction reactions synthesis syntheses method modification rearrangement reduction oxidation cyclization coupling fragmentation elimination carbonylation esterification hydration hydroxylation hydroboration annulation acylation alkylation amination arylation olefination homologation condensation degradation electrolysis glycosylation transvinylation acetoxylation photolysis photocycloaddition aldehyde indole pyrrole quinoline isoquinoline quinazoline furan thiophene cinnoline oxazole pyrazole imidazole triazole triazine pyrazine quinoxaline acridine azulene indigo tetralin phenanthrene ethylenimine allylamine cinnamaldehyde amine sulfur sulfoxide lactam acyl polyene alkene alkyne allyl vinyl cis trans meta arenes and of the name named with related shared carbonyl chromium acid ester enolate trimethylenemethane isonitrile cyanide nitrite trichloroacetimidate stereoselective asymmetric boron oxygen oxymercuration solvomercuration pinacol semipinacol ethylene adamantane adamantization carbinol cyano lactonization hydrogenation ring contraction oxidative reductive thermal photochemical'.split())
for e in entries:
    known.update(t for t in re.findall(r'[^\W\d_]+',normal(e['name'])) if len(t)>3 and t not in generic)
known.update(['borche','borch','nicoloau','nicolaou','hayworth','haworth','voight','voigt','vollhard','volhard','bodroux','bodroux','chichibabin'])
known={normal(t) for t in known}
scale=3
jobs=[]

def figure(id,kind,n,crop,caption,folder='mundy'):
    assert 0<=crop[0]<crop[2]<=432 and 0<=crop[1]<crop[3]<=666,(id,crop)
    path=f'assets/{folder}/{id}-{kind}.png'
    doc[n+17].get_pixmap(matrix=pymupdf.Matrix(scale,scale),clip=pymupdf.Rect(crop),alpha=False,colorspace=pymupdf.csGRAY).save(ROOT/path)
    jobs.append(dict(id=id,type=kind,printedPage=n,pdfPage=n+18,crop=crop,scale=scale,image=path))
    return dict(image=path,printedPage=n,pdfPage=n+18,book='mundy',caption=caption)

catalog=[];book={};sections={};prompts={};masks={};coverage={};reagents=[]
for e in entries:
    id=e['id'];n=e['printedPage']
    pages=coverage.setdefault(id,[])
    if n not in pages:pages.append(n)
    if e['status']!='new':continue
    summary=e['summary']
    catalog.append(dict(id=id,name=e['name'],bookName=e['name'],aliases=e.get('aliases',''),summary=summary,
        question=summary+' Identify the named reaction.',equation=summary,explanation=summary,reagents='',
        difficulty='Book entry',sourceOverview=True,sourceBook='mundy',printedPage=n,
        categories=e['categories'],category=e['categories'][0],appendixPages=[],appendixSummary=None))
    reaction=figure(id,'reaction',n,e['reactionCrop'],'Reaction & conditions')
    sections[id]={'reaction':reaction}
    source={'pages':[n,e['endPage']] if e['endPage']!=n else [n],'book':'mundy','reaction':reaction,'applications':[]}
    if e.get('mechanismCrop'):
        source['mechanism']=figure(id,'mechanism',e.get('mechanismPage',n),e['mechanismCrop'],e.get('mechanismCaption','Proposed mechanism'))
    if e.get('notesCrop'):
        sections[id]['outline']=figure(id,'notes',n,e['notesCrop'],'Notes')
    if e.get('applicationCrop'):
        source['applications'].append(figure(id,'applications',n,e['applicationCrop'],'Synthetic applications'))
    if e['endPage']>n:
        for page in range(n+1,e['endPage']+1):
            source['applications'].append(figure(id,f'applications-{page}',page,[50,65,389,622],'Synthetic applications'))
    book[id]=source
    # OCR and the supplied PDF text layer both contribute masks. Only words
    # overlapping the scheme are considered; the source figure is never changed.
    original=Image.open(ROOT/reaction['image']).convert('L')
    width,height=original.size;crop=e['reactionCrop'];ox=math.floor(crop[0]*scale);oy=math.floor(crop[1]*scale)
    areas=[]
    def add(text,rect,detection):
        if not known.intersection(re.findall(r'[^\W\d_]+',normal(text))):return
        x0,y0,x1,y1=rect
        if x1<=crop[0] or x0>=crop[2] or y1<=crop[1] or y0>=crop[3]:return
        x=max(0,math.floor(x0*scale-ox)-3);y=max(0,math.floor(y0*scale-oy)-3)
        right=min(width,math.ceil(x1*scale-ox)+3);bottom=min(height,math.ceil(y1*scale-oy)+3)
        if right>x and bottom>y:areas.append(dict(text=text,rect=[x,y,right-x,bottom-y],detection=detection))
    for w in doc[n+17].get_text('words'):
        add(w[4],list(w[:4]),'pdf')
    for w in ocr[str(n)]['words']:
        x,y,wid,h=w['rect'];add(w['text'],[x*432,y*666,(x+wid)*432,(y+h)*666],'ocr')
    for area in e.get('extraMasks',[]):
        areas.append(dict(area,detection='review'))
    masked=original.copy();draw=ImageDraw.Draw(masked)
    for a in areas:
        x,y,w,h=a['rect'];draw.rectangle((x,y,x+w-1,y+h-1),fill=255)
    digest=hashlib.sha256(masked.tobytes()).hexdigest()[:12]
    output=f'assets/flashcards/{id}-{digest}.png';masked.save(ROOT/output)
    prompts[id]=dict(reaction,image=output)
    masks[id]=dict(source=reaction['image'],image=output,width=width,height=height,ocrAudited=True,masks=areas)
for e in reagent_entries:
    fs=[figure(e['id'],str(n),n,[50,65,390,622],'Structure, preparation & uses','reagents') for n in range(e['printedPage'],e['endPage']+1)]
    # Search can match chemical names and applications in the supplied text layer;
    # displayed titles and aliases are reviewed separately from the OCR.
    search=' '.join(doc[n+17].get_text() for n in range(e['printedPage'],e['endPage']+1))
    reagents.append(dict(e,figures=fs,searchText=search))
catalog.sort(key=lambda e:normal(e['name']));reagents.sort(key=lambda e:normal(e['name']))
write('scripts/mundy-figures.json',jobs);write('scripts/mundy-flashcard-masks.json',masks)
data={'mundyCatalog':catalog,'mundyBookReactions':book,'mundyBookSections':sections,'mundyFlashcardFigures':prompts,'mundyCoverage':coverage,'reagentCatalog':reagents}
(ROOT/'assets/mundy-data.js').write_text('// Generated by scripts/build-mundy.py from the supplied Mundy et al. (2005) book.\n'+'\n'.join('const '+k+' = '+json.dumps(v,ensure_ascii=False,indent=2)+';' for k,v in data.items())+'\n')
current={p['image'] for p in prompts.values()}
for old in (ROOT/'assets/flashcards').glob('mundy-*.png'):
    if str(old.relative_to(ROOT)) not in current:old.unlink()
print(f'Imported {len(catalog)} new reactions, {len(coverage)} covered reaction IDs, {len(reagents)} reagents and {len(jobs)} source figures.')
