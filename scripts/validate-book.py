"""Check chapter coverage, appendix memberships, citations and rendered PNGs."""
import json
import struct
from pathlib import Path

root = Path(__file__).resolve().parent.parent
source = (root/'assets/reactions.js').read_text()
categories = json.loads(source.split('const bookCategories = ')[1].split(';\nconst reactionCatalog')[0])
cards = json.loads(source.split('const reactionCatalog = ')[1].strip().rstrip(';'))
book = json.loads((root/'assets/book-data.js').read_text().split('const bookReactions = ')[1].strip().rstrip(';'))
rows = json.loads((root/'scripts/appendix-categories.json').read_text())
jobs = json.loads((root/'scripts/book-figures.json').read_text())
legacy = json.loads((root/'scripts/legacy-reactions.json').read_text())
assert len(cards)==251 and len(book)==251
assert len({c['id'] for c in cards})==251
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
    assert b.get('mechanism') or b.get('mechanismNote'), c['name']
    assert b['reaction'] and b['applications'], c['name']
    for f in [b['reaction'],b.get('mechanism'),*b['applications']]:
        if f:
            assert f['pdfPage']==f['printedPage']+52
            assert (root/f['image']).is_file(), f['image']

assert len({j['file'] for j in jobs})==len(jobs)==751
for j in jobs:
    data = (root/j['file']).read_bytes()
    assert data[:8]==b'\x89PNG\r\n\x1a\n', j['file']
    w,h = struct.unpack('>II',data[16:24])
    assert w>=900 and h>=80, (j['file'],w,h)

print('PASS: 250 chapters + 1 preserved card; 23 appendix categories + unlisted group; 751 PNGs; original IDs and all citations verified.')
