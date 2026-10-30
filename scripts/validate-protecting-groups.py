"""Validate catalog coverage, source ranges, images, and optional PDF margin cropping.
Run with the build environment Python; pass the source PDF to audit its page geometry.
"""
import json
import sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
data = json.loads((ROOT / 'scripts/protecting-groups.json').read_text())
entries = data['entries']
assert len(entries) == 1411
assert sum(e['kind'] == 'group' for e in entries) == 1275
assert len({e['id'] for e in entries}) == len(entries)
counts = [356, 89, 119, 171, 99, 448, 13, 116]
for chapter, count in zip(data['chapters'], counts):
    rows = [e for e in entries if e['chapter'] == chapter['id']]
    assert len(rows) == count, chapter
    assert [e['page'] for e in rows] == sorted(e['page'] for e in rows), chapter
    assert all(chapter['firstPage'] <= e['page'] <= chapter['lastPage'] for e in rows)
pages = set()
for e in entries:
    assert e['anchor'], (e['id'], 'Unresolved source heading')
    assert e['source'], (e['id'], 'Missing source excerpt')
    for mode in ['source', 'protection', 'deprotection']:
        for r in e[mode]:
            assert 0 <= r['top'] < r['bottom'] <= 1, (e['id'], r)
            assert 24 <= r['page'] <= 985
            pages.add(r['page'])
            if mode != 'source':
                assert any(s['page'] == r['page'] and s['top'] <= r['top'] and s['bottom'] >= r['bottom'] for s in e['source']), (e['id'], mode, r)
for page in pages:
    path = ROOT / f'assets/protecting-groups/page-{page:04}.webp'
    with Image.open(path) as image:
        assert image.size == (1110, 1707), (page, image.size)
        image.verify()
# Recognizable procedures, shared heading methods, and an explicitly reference-only list.
by_id = {e['id']: e for e in entries}
for id, formation, cleavage in [('greene-2-0004', 30, 32), ('greene-7-0862', 725, 727), ('greene-7-0838', 712, 712), ('greene-4-0490', 477, 478), ('greene-9-1299', 944, 944)]:
    assert by_id[id]['protection'][0]['page'] == formation, id
    assert by_id[id]['deprotection'][0]['page'] == cleavage, id
assert not by_id['greene-2-0225']['protection'] and not by_id['greene-2-0225']['deprotection']
if len(sys.argv) > 1:
    import pymupdf
    pdf = pymupdf.open(sys.argv[1])
    for n in sorted(pages):
        page = pdf[n + 26]
        notices = []
        for block in page.get_text('dict')['blocks']:
            for line in block.get('lines', []):
                text = ''.join(s['text'] for s in line['spans'])
                x0, y0, x1, y1 = line['bbox']
                if 'Downloaded from' in text:
                    notices.append(x0)
                    assert x0 > 414, (n, 'Download notice overlaps crop')
                if line['dir'] == (1., 0.) and 61 <= y0 < 630:
                    assert 44 <= x0 and x1 <= 414 and y1 <= 630, (n, text, line['bbox'])
        assert notices, (n, 'Expected download strip not found')
    print(f'PDF geometry: all {len(pages)} crops retain body text and exclude the download notice.')
print(f'PASS: {len(entries)} ordered entries, 1,275 group listings, {len(pages)} images, procedure ranges, and shared/reference-only cases.')
