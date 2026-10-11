"""Validate the reviewed Li import, coverage, optional sections and masks.
Run after build-li.py; requires Pillow. No source PDF is needed.
"""
import json
import re
from pathlib import Path
from PIL import Image
ROOT = Path(__file__).resolve().parent.parent

def read(path): return json.loads((ROOT/path).read_text())
def js(path, key):
    text = (ROOT/path).read_text().split('const '+key+' = ',1)[1]
    return json.JSONDecoder().raw_decode(text)[0]

entries = read('scripts/li-entries.json')
original = js('assets/reactions.js', 'reactionCatalog')
categories = {c['id'] for c in js('assets/reactions.js','bookCategories')}
catalog = js('assets/li-data.js', 'liCatalog')
book = js('assets/li-data.js', 'liBookReactions')
sections = js('assets/li-data.js', 'liBookSections')
figures = js('assets/li-data.js', 'liFlashcardFigures')
coverage = js('assets/li-data.js', 'liCoverage')
masks = read('scripts/li-flashcard-masks.json')
new_ids = {e['id'] for e in entries if e['status']=='new'}
old_ids = {r['id'] for r in original}
assert len(entries)==186 and len(catalog)==len(new_ids)==36
assert len(coverage)==181 and not new_ids & old_ids
assert {r['id'] for r in catalog}==set(book)==set(sections)==set(figures)==set(masks)==new_ids
assert set(coverage) <= new_ids | old_ids
for e in entries:
    assert e['printedPage'] in coverage[e['id']]['pages']
    assert e['name'] in coverage[e['id']]['names']
    if e['status']=='new':
        assert bool(e['mechanismCrop'])==bool(book[e['id']].get('mechanism'))
        assert ('outline' in sections[e['id']])==e.get('hasOutline',True)
for r in catalog:
    id = r['id']
    assert r['categories'] and set(r['categories']) <= categories
    assert r['sourceBook']=='li' and book[id]['applications']
    assert book[id]['pages'][0]==r['printedPage']
    f=masks[id]
    assert f['ocrAudited'] and f['source']==sections[id]['reaction']['image']
    assert f['image']==figures[id]['image']
    assert re.fullmatch(r'assets/flashcards/li-\d+-[a-f0-9]{12}\.png',f['image'])
    assert Image.open(ROOT/f['source']).size==Image.open(ROOT/f['image']).size==(f['width'],f['height'])
    for m in f['masks']:
        x,y,w,h=m['rect']; assert 0<=x<x+w<=f['width'] and 0<=y<y+h<=f['height']
        assert m['text'] != 'Br', 'Do not mistake bromine for the BR abbreviation'
for job in read('scripts/li-figures.json'):
    assert job['id'] in new_ids and job['pdfPage']==job['printedPage']+19
    assert (ROOT/job['image']).is_file()
    assert Image.open(ROOT/job['image']).size[0]==1020
expected={'lawessons-reagent':'Lawesson','meisenheimer-complex':'Meisenheimer','pcc-oxidation':'PCC','pdc-oxidation':'PDC'}
for id,name in expected.items(): assert any(name in m['text'] for m in masks[id]['masks'])
assert any('Sanger' in m['text'] for m in masks['meisenheimer-complex']['masks'])
print('PASS: 36 additions; all 186 TOC rows mapped to 181 unique reactions; categories, citations, assets, optional sections and OCR mask coverage verified.')
