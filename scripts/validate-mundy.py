"""Validate Mundy coverage, source crops, reagent pages, and prompt pixels.
Run with Python + Pillow; no source PDF or browser is required.
"""
import json
import math
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
def read(path): return json.loads((ROOT/path).read_text())
def js(path, key):
    return json.JSONDecoder().raw_decode((ROOT/path).read_text().split('const '+key+' = ',1)[1])[0]

entries = read('scripts/mundy-entries.json')
new = {e['id']:e for e in entries if e['status']=='new'}
catalog = js('assets/mundy-data.js','mundyCatalog')
book = js('assets/mundy-data.js','mundyBookReactions')
sections = js('assets/mundy-data.js','mundyBookSections')
prompts = js('assets/mundy-data.js','mundyFlashcardFigures')
coverage = js('assets/mundy-data.js','mundyCoverage')
reagents = js('assets/mundy-data.js','reagentCatalog')
masks = read('scripts/mundy-flashcard-masks.json')
old = js('assets/reactions.js','reactionCatalog') + js('assets/li-data.js','liCatalog')
old_ids = {r['id'] for r in old}
assert len(new)==len(catalog)==185
assert not old_ids & set(new), 'Existing reaction IDs and progress must be preserved'
assert {r['id'] for r in catalog}==set(new)==set(book)==set(sections)==set(prompts)==set(masks)
assert set(coverage)=={e['id'] for e in entries}
assert set(coverage) <= old_ids | set(new)
for e in entries:
    assert e['printedPage'] in coverage[e['id']]
for r in catalog:
    id=r['id'];e=new[id]
    assert r['categories']==['mundy-additions'] and r['sourceBook']=='mundy'
    assert r['summary'] and r['question'] and r['explanation']
    assert r['printedPage']==book[id]['pages'][0]==e['printedPage']
    assert bool(book[id].get('mechanism'))==bool(e['mechanismCrop'])
    if e['mechanismCrop']:
        assert book[id]['mechanism']['printedPage']==e.get('mechanismPage',e['printedPage'])
    assert bool(sections[id].get('outline'))==bool(e['notesCrop'])
    f=masks[id]
    assert f['source']==sections[id]['reaction']['image'] and f['image']==prompts[id]['image']
    assert f['ocrAudited']
    original=Image.open(ROOT/f['source']).convert('L')
    actual=Image.open(ROOT/f['image']).convert('L')
    assert original.size==actual.size==(f['width'],f['height'])
    expected=original.copy();draw=ImageDraw.Draw(expected)
    for m in f['masks']:
        x,y,w,h=m['rect']
        assert 0<=x<x+w<=f['width'] and 0<=y<y+h<=f['height'], (id,m)
        draw.rectangle((x,y,x+w-1,y+h-1),fill=255)
    assert ImageChops.difference(actual,expected).getbbox() is None, 'Only name masks may alter prompt pixels: '+id

assert len(reagents)==151 and len({r['id'] for r in reagents})==151
pages=[]
for r in reagents:
    expected=list(range(r['printedPage'],r['endPage']+1))
    assert [f['printedPage'] for f in r['figures']]==expected
    assert r['name'] and r['aliases'] and r['searchText']
    pages.extend(expected)
assert sorted(pages)==list(range(715,872)), 'Every reagent source page must be included exactly once'
jobs=read('scripts/mundy-figures.json')
assert len({j['image'] for j in jobs})==len(jobs)
for job in jobs:
    assert job['pdfPage']==job['printedPage']+18
    x0,y0,x1,y1=job['crop'];s=job['scale']
    assert 0<=x0<x1<=432 and 0<=y0<y1<=666
    size=(math.ceil(x1*s)-math.floor(x0*s),math.ceil(y1*s)-math.floor(y0*s))
    im=Image.open(ROOT/job['image'])
    assert im.size==size,(job['image'],im.size,size)
    assert im.convert('L').getextrema()[0]<100, 'Source figure must contain readable content'
files={j['image'] for j in jobs}
for id,b in book.items():
    for f in [b['reaction'],b.get('mechanism'),*b['applications'],sections[id].get('outline')]:
        if f:
            assert f['image'] in files and f['book']=='mundy'
            assert f['pdfPage']==f['printedPage']+18
for r in reagents:
    assert all(f['image'] in files and f['book']=='mundy' for f in r['figures'])
print(f'PASS: {len(catalog)} new reactions; {len(coverage)} covered reactions; 151 reagents / 157 source pages; {len(jobs)} source crops; anonymous-prompt pixels, citations and IDs verified.')
