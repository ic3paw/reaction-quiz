"""Build Greene's fourth-edition index and cropped source excerpts from the supplied PDF.
Usage: python build-protecting-groups.py SOURCE.pdf [--render]
Requires PyMuPDF and Pillow. The source PDF is never copied into the website.
"""
import argparse
import io
from concurrent.futures import ProcessPoolExecutor
from PIL import Image
import difflib
import json
import re
import unicodedata
from pathlib import Path
import pymupdf

ROOT = Path(__file__).resolve().parents[1]
CHAPTERS = [
    (2, 'Hydroxyl groups and diols', 16, 24, 366),
    (3, 'Phenols and catechols', 367, 369, 430),
    (4, 'Carbonyl groups', 431, 434, 532),
    (5, 'Carboxyl groups', 533, 537, 646),
    (6, 'Thiol groups', 647, 649, 695),
    (7, 'Amino groups', 696, 706, 926),
    (8, 'Alkyne C–H', 927, 927, 933),
    (9, 'Phosphate groups', 934, 936, 985),
]
OFFSET = 26  # zero-based PDF index = printed page + 26
CROP = [44, 61, 414, 630]  # page body; right-hand download notice starts at x=424.6


def clean(text):
    # The PDF inserts a space after ligatures; join that split without changing chemistry.
    text = re.sub(r'([ﬀﬁﬂﬃﬄ])\s+', r'\1', text)
    text = unicodedata.normalize('NFKC', text)
    return re.sub(r'\s+', ' ', text.replace('\x01', '–')).strip()


def key(text):
    return re.sub(r'[^a-z0-9]', '', unicodedata.normalize('NFKD', clean(text)).lower())


def lines(page):
    result = []
    for block in page.get_text('dict')['blocks']:
        for line in block.get('lines', []):
            if line['dir'] != (1., 0.):
                continue
            spans = line['spans']
            result.append({'text': clean(''.join(s['text'] for s in spans)),
                           'bbox': list(line['bbox']), 'spans': spans})
    return sorted(result, key=lambda line: (round(line['bbox'][1], 0), line['bbox'][0]))


def parse_toc(pdf):
    entries, chapters = [], []
    for number, title, first, last_toc, last in CHAPTERS:
        chapter = {'id': f'chapter-{number}', 'number': number, 'name': title, 'firstPage': first, 'lastPage': last}
        chapters.append(chapter)
        pending = ''
        major, minor = '', ''
        for printed in range(first, last_toc + 1):
            page_lines = lines(pdf[printed + OFFSET])
            body_start = min((line['bbox'][1] for line in page_lines if line['bbox'][1] > 60 and any(abs(s['size'] - 10) < .15 for s in line['spans'])), default=1000)
            candidates = []
            for line in page_lines:
                spans, (x0, y0, x1, y1) = line['spans'], line['bbox']
                # Contents use 9pt body and bold type; body discussion uses 10pt.
                if y0 < 60 or y0 >= body_start or y1 > (575 if printed == first else 611):
                    continue
                if not any(abs(s['size'] - 9) < .15 for s in spans):
                    continue
                if any(s['size'] > 9.2 for s in spans):
                    continue
                candidates.append(line)
            # Join right-aligned page numbers to their section titles.
            merged = []
            for line in candidates:
                if line['text'].isdigit() and line['bbox'][0] > 350 and merged:
                    merged[-1]['text'] += ', ' + line['text']
                else:
                    merged.append(dict(line))
            for line in merged:
                text = line['text']
                match = re.match(r'^(.*),\s*(\d{2,3})\s*$', text)
                if not match:
                    pending += text + ' '
                    continue
                name = clean(pending + match[1]); pending = ''
                page = int(match[2])
                if not first <= page <= last:
                    raise ValueError((number, name, page))
                bold = sum(len(s['text']) for s in line['spans'] if 'Bold' in s['font']) > len(text) / 2
                if bold:
                    if name.upper() == name or name.startswith(('Protection for ', 'Protecton of ')):
                        major, minor = name.capitalize(), ''
                    else:
                        minor = name
                path = [part for part in [major, minor] if part]
                if bold: path = path[:-1]
                entries.append({'id': f'greene-{number}-{len(entries) + 1:04}', 'chapter': chapter['id'],
                                'name': name, 'page': page, 'kind': 'section' if bold else 'group',
                                'category': ' / '.join(path) or title, 'tocPage': printed})
        if pending:
            raise ValueError(f'Unparsed contents in chapter {number}: {pending}')
    return chapters, entries


def find_anchor(entry, page_lines):
    wanted = key(entry['name'])
    ranked = []
    for i, line in enumerate(page_lines):
        x0, y0, x1, y1 = line['bbox']
        if not 60 <= y0 < 611 or x0 > 125:
            continue
        if not any(s['size'] >= 9.8 for s in line['spans']):
            continue
        is_bold = any('Bold' in s['font'] and s['size'] >= 9.8 for s in line['spans'])
        text = re.sub(r'^\d+\.\s*', '', line['text'])
        # Join wrapped chemical names, but not unrelated distant lines/figures.
        for following in page_lines[i + 1:i + 3]:
            if following['bbox'][1] - y1 > 8 or following['bbox'][0] > 125:
                break
            text += ' ' + following['text']
            y1 = following['bbox'][3]
        actual = key(text)
        if actual.startswith(wanted):
            score = 1.0 if is_bold else .96
        elif wanted in actual and is_bold:
            score = .94
        else:
            # Table-of-contents names omit suffixes such as Ether or Carbamate.
            score = difflib.SequenceMatcher(None, wanted, actual[:len(wanted)]).ratio() * .9
            if not is_bold: score *= .8
        ranked.append((score, -line['bbox'][1], line))
    if not ranked: return None
    score, _, line = max(ranked, key=lambda item: item[:2])
    if score < .75: return None
    return {'page': entry['page'], 'y': round(max(CROP[1], line['bbox'][1] - 3), 2),
            'score': round(score, 3), 'matched': line['text']}


def build_sources(pdf, chapters, entries):
    body = {page: lines(pdf[page + OFFSET]) for page in range(24, 986)}
    anchors = [find_anchor(e, body[e['page']]) for e in entries]
    overrides = json.loads((ROOT / 'scripts/protecting-groups-overrides.json').read_text())['anchors']
    for i, entry in enumerate(entries):
        if entry['id'] in overrides:
            page, y = overrides[entry['id']]
            line = min(body[page], key=lambda line: abs(line['bbox'][1] - 3 - y))
            anchors[i] = {'page': page, 'y': y, 'score': 1.0, 'matched': line['text'], 'reviewed': True}
        entry['anchor'] = anchors[i]
    # Preserve an auditable list of unresolved source headings, never silently omit them.
    diagnostics = []
    for i, entry in enumerate(entries):
        start = anchors[i]
        chapter = next(c for c in chapters if c['id'] == entry['chapter'])
        following = entries[i + 1] if i + 1 < len(entries) and entries[i + 1]['chapter'] == entry['chapter'] else None
        next_anchor = anchors[i + 1] if following else None
        if start:
            # Several names can share one heading or one methods block.
            next_anchor = min((anchors[j] for j in range(len(entries))
                if entries[j]['chapter'] == entry['chapter'] and anchors[j]
                and (anchors[j]['page'], anchors[j]['y']) > (start['page'], start['y'])),
                key=lambda a: (a['page'], a['y']), default=None)
        if start and next_anchor and (next_anchor['page'], next_anchor['y']) > (start['page'], start['y']):
            end = dict(next_anchor)
        elif start and following and following['page'] > entry['page']:
            end = {'page': following['page'] - 1, 'y': CROP[3]}
        elif not following:
            end = {'page': chapter['lastPage'], 'y': CROP[3]}
        else:
            end = {'page': start['page'] if start else entry['page'], 'y': CROP[3]}
        if not start:
            start = {'page': entry['page'], 'y': CROP[1]}
            # When a shared table/list has no independent heading, retain its whole page.
            end = {'page': max(entry['page'], following['page'] - 1 if following else chapter['lastPage']), 'y': CROP[3]}
        entry['start'], entry['end'] = start, end
        if not anchors[i] or anchors[i]['score'] < .94:
            diagnostics.append({'id': entry['id'], 'name': entry['name'], 'page': entry['page'], 'match': anchors[i]})
    # Adjacent headings followed by shared conditions (e.g. seven acyclic dithioketals).
    for i, entry in enumerate(entries):
        j = i
        while j + 1 < len(entries):
            e = entries[j]
            if e['kind'] != 'group' or not e['anchor'] or e['start']['page'] != e['end']['page'] or e['end']['y'] - e['start']['y'] > 27 or entries[j + 1]['kind'] != 'group':
                break
            j += 1
        if j > i:
            entry['end'] = entries[j]['end']
            entry['shared'] = True
    for entry in entries:
        start, end = entry['start'], entry['end']
        markers = []
        for page in range(start['page'], end['page'] + 1):
            for line in body[page]:
                pos = (page, line['bbox'][1] - 3)
                if not (start['page'], start['y']) <= pos < (end['page'], end['y']): continue
                text = clean(''.join(s['text'] for s in line['spans'] if s['size'] >= 9.8))
                if not any('Bold' in s['font'] and s['size'] >= 9.8 for s in line['spans']): continue
                if re.fullmatch(r'(?:General (?:Methods? (?:of|for) )?)?(?:Formation|Cleavage)(?:\s*/\s*(?:Formation|Cleavage))?', text, re.I):
                    kinds = [kind for word, kind in [('formation', 'protection'), ('cleavage', 'deprotection')] if word in text.lower()]
                    markers.append({'page': page, 'y': round(pos[1], 2), 'kinds': kinds})
        entry['source'] = regions(start, end)
        entry['protection'], entry['deprotection'] = [], []
        for index, marker in enumerate(markers):
            stop = markers[index + 1] if index + 1 < len(markers) else end
            for kind in marker['kinds']:
                entry[kind].extend(regions(marker, stop))
        entry['combined'] = any(len(m['kinds']) == 2 for m in markers)
        entry['searchText'] = entry['anchor']['matched'] if entry['anchor'] else entry['name']
    return diagnostics


def regions(start, end):
    result = []
    for page in range(start['page'], end['page'] + 1):
        top = start['y'] if page == start['page'] else CROP[1]
        bottom = end['y'] if page == end['page'] else CROP[3]
        if bottom - top < 5: continue
        result.append({'page': page, 'top': round((top - CROP[1]) / (CROP[3] - CROP[1]), 6),
                       'bottom': round((bottom - CROP[1]) / (CROP[3] - CROP[1]), 6)})
    return result


def render_page(job):
    source, page = job
    destination = ROOT / 'assets/protecting-groups' / f'page-{page:04}.webp'
    if destination.exists():
        with Image.open(destination) as previous:
            if previous.size == (3 * (CROP[2] - CROP[0]), 3 * (CROP[3] - CROP[1])): return page
    with pymupdf.open(source) as pdf:
        pix = pdf[page + OFFSET].get_pixmap(matrix=pymupdf.Matrix(3, 3), clip=pymupdf.Rect(CROP), alpha=False)
        image = Image.frombytes('RGB', [pix.width, pix.height], pix.samples)
        image.save(destination, format='WEBP', lossless=True, method=2)
    return page


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('pdf', type=Path)
    parser.add_argument('--render', action='store_true')
    args = parser.parse_args()
    pdf = pymupdf.open(args.pdf)
    chapters, entries = parse_toc(pdf)
    diagnostics = build_sources(pdf, chapters, entries)
    (ROOT / '.book-work/greene-unresolved.json').write_text(json.dumps(diagnostics, ensure_ascii=False, indent=2))
    print('Headings needing review:',len(diagnostics),'no anchor:',sum(e['anchor'] is None for e in entries))
    output = ROOT / 'scripts/protecting-groups.json'
    output.write_text(json.dumps({'source': "Wuts & Greene, Greene’s Protective Groups in Organic Synthesis, 4th edition (2007)", 'chapters': chapters, 'entries': entries}, ensure_ascii=False, indent=2) + '\n')
    print('Contents:', len(entries), 'rows,', sum(e['kind'] == 'group' for e in entries), 'groups')
    public_entries = [{k: e[k] for k in ['id', 'chapter', 'name', 'page', 'kind', 'category', 'source', 'protection', 'deprotection', 'combined', 'searchText']} for e in entries]
    catalog = {'chapters': chapters, 'entries': public_entries, 'pageWidth': CROP[2] - CROP[0], 'pageHeight': CROP[3] - CROP[1]}
    (ROOT / 'assets/protecting-groups-data.js').write_text('const protectingGroupCatalog = ' + json.dumps(catalog, ensure_ascii=False, separators=(',', ':')) + ';\n')
    if args.render:
        pages = sorted({region['page'] for e in entries for region in e['source']})
        (ROOT / 'assets/protecting-groups').mkdir(exist_ok=True)
        with ProcessPoolExecutor(max_workers=4) as executor:
            for index, page in enumerate(executor.map(render_page, [(str(args.pdf), page) for page in pages])):
                if (index + 1) % 100 == 0: print(f'Rendered {index + 1}/{len(pages)} source pages', flush=True)
    for chapter in chapters:
        subset = [e for e in entries if e['chapter'] == chapter['id']]
        print(chapter['name'], len(subset), subset[0]['name'], '...', subset[-1]['name'])

if __name__ == '__main__':
    main()
