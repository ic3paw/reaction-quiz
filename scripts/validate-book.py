"""Check chapter coverage, appendix memberships, citations and rendered PNGs."""
import json
import struct
from pathlib import Path

root = Path(__file__).resolve().parent.parent
source = (root/'assets/reactions.js').read_text()
categories = json.loads(source.split('const bookCategories = ')[1].split(';\nconst reactionCatalog')[0])
cards = json.loads(source.split('const reactionCatalog = ')[1].strip().rstrip(';'))
book = json.loads((root/'assets/book-data.js').read_text().split('const bookReactions = ')[1].strip().rstrip(';'))
sections = json.loads((root/'assets/book-sections.js').read_text().split('const bookSections = ')[1].strip().rstrip(';'))
rows = json.loads((root/'scripts/appendix-categories.json').read_text())
jobs = json.loads((root/'scripts/book-figures.json').read_text())
legacy = json.loads((root/'scripts/legacy-reactions.json').read_text())
assert len(cards)==251 and len(book)==251
assert len({c['id'] for c in cards})==251
assert set(sections)==set(book), 'Every card needs its own reaction and outline/history sections'
chapters = {c['printedPage']:c for c in cards if not c.get('supplemental')}
assert set(chapters)==set(range(2,501,2)), 'Missing or duplicate book chapter'
assert len(categories)==24
assert {c['id'] for c in legacy} <= {c['id'] for c in cards}, 'Original IDs changed'
for c in cards:
    assert c['categories'] and all(id in {x['id'] for x in categories} for id in c['categories'])
    assert c['question'] and c['summary'] and c['equation'] and c['explanation']
    if not c.get('supplemental'):
        expected = {r['category'] for r in rows if r['printedPage']==c['printedPage']} or {'not-listed'}
        assert set(c['categories'])==expected, c['name']
        assert book[c['id']]['pages']==[c['printedPage'],c['printedPage']+1]
    b = book[c['id']]
    s = sections[c['id']]
    assert s.get('reaction') and (s.get('outline') or s.get('outlineNote')), c['name']
    assert not s['reaction'].get('viewport'), 'Use standalone scheme crops so full-size links cannot reveal history'
    for f in [s['reaction'], s.get('outline')]:
        if f:
            assert f['pdfPage']==f['printedPage']+52
            assert (root/f['image']).is_file(), f['image']
    if not c.get('supplemental'):
        assert s['reaction']['image'] != s['outline']['image'], c['name']
        assert s['reaction']['printedPage']==s['outline']['printedPage']==c['printedPage']
    assert b.get('mechanism') or b.get('mechanismNote'), c['name']
    assert b['reaction'] and b['applications'], c['name']
    for f in [b['reaction'],b.get('mechanism'),*b['applications']]:
        if f:
            assert f['pdfPage']==f['printedPage']+52
            assert (root/f['image']).is_file(), f['image']

assert len({j['file'] for j in jobs})==len(jobs)==751
section_jobs = json.loads((root/'scripts/book-section-figures.json').read_text())
assert len(section_jobs)==len({j['file'] for j in section_jobs})==500
assert {j['file'] for j in section_jobs}=={f['image'] for id,s in sections.items() if id!='fischer' for f in [s['reaction'],s['outline']]}
for j in jobs + section_jobs:
    data = (root/j['file']).read_bytes()
    assert data[:8]==b'\x89PNG\r\n\x1a\n', j['file']
    w,h = struct.unpack('>II',data[16:24])
    assert w>=900 and h>=80, (j['file'],w,h)
    if j in section_jobs:
        x,y,cw,ch=j['crop']
        assert 0<=x<x+cw<=1 and 0<=y<y+ch<=1, j['file']

print('PASS: 251 cards with reaction and outline/history sections; 500 separate section crops; 751 original PNGs including applications for every card; IDs, categories and citations verified.')
