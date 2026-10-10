"""Check chapter coverage, appendix memberships, citations and rendered PNGs."""
import json
import struct
import unicodedata
from pathlib import Path

root = Path(__file__).resolve().parent.parent
source = (root/'assets/reactions.js').read_text()
categories = json.loads(source.split('const bookCategories = ')[1].split(';\nconst reactionCatalog')[0])
cards = json.loads(source.split('const reactionCatalog = ')[1].strip().rstrip(';'))
book = json.loads((root/'assets/book-data.js').read_text().split('const bookReactions = ')[1].strip().rstrip(';'))
sections = json.loads((root/'assets/book-sections.js').read_text().split('const bookSections = ')[1].strip().rstrip(';'))
prompts = json.loads((root/'assets/flashcard-figures.js').read_text().split('const flashcardFigures = ')[1].strip().rstrip(';'))
masks = json.loads((root/'scripts/flashcard-masks.json').read_text())
rows = json.loads((root/'scripts/appendix-categories.json').read_text())
jobs = json.loads((root/'scripts/book-figures.json').read_text())
legacy = json.loads((root/'scripts/legacy-reactions.json').read_text())
assert len(cards)==251 and len(book)==251
assert len({c['id'] for c in cards})==251
assert set(sections)==set(book), 'Every card needs its own reaction and outline/history sections'
assert set(prompts)==set(masks)==set(book), 'Every name-recall card must have an audited prompt image'
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
    prompt, mask = prompts[c['id']], masks[c['id']]
    assert mask['source']==s['reaction']['image']
    assert prompt['image']==mask['image'] and prompt['image']!=mask['source']
    assert prompt['printedPage']==s['reaction']['printedPage']
    assert mask['terms'], c['name']
    original = (root/mask['source']).read_bytes()
    redacted = (root/mask['image']).read_bytes()
    assert redacted[:8]==b'\x89PNG\r\n\x1a\n'
    assert original[16:24]==redacted[16:24], 'Whiteouts must not crop or resize the scheme'
    assert struct.unpack('>II',redacted[16:24])==(mask['width'],mask['height'])
    if mask['masks']:
        assert original!=redacted, 'Name masks must actually change the image: '+c['name']
    else:
        assert original==redacted, 'Schemes without identifying text should remain intact'
    for area in mask['masks']:
        x,y,w,h=area['rect']
        assert 0<=x<x+w<=mask['width'] and 0<=y<y+h<=mask['height']
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

assert [m['text'].lower() for m in masks['fleming-tamao-oxidation']['masks']].count('fleming')==2
assert [m['text'].lower() for m in masks['fleming-tamao-oxidation']['masks']].count('tamao')==2
references = json.loads((root/'scripts/flashcard-name-references.json').read_text())
def normalize_name(text):
    return ''.join(c for c in unicodedata.normalize('NFKD', text.lower()) if not unicodedata.combining(c))
for name, ids in references['additionalNames'].items():
    for id in ids:
        assert name in {normalize_name(m['text']) for m in masks[id]['masks']}, f'Missing related name: {name} in {id}'
assert sum(normalize_name(m['text'])=='ganem' for m in masks['kornblum-oxidation']['masks'])==2
for id, figure in prompts.items():
    assert '-' in Path(figure['image']).stem, 'Prompt URLs need a content revision to avoid stale unmasked images'
print('PASS: 251 cards and audited name-recall figures with unchanged dimensions; 500 section crops; 751 original PNGs; IDs, categories and citations verified.')
