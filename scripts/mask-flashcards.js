// macOS: osascript -l JavaScript scripts/mask-flashcards.js /path/to/book.pdf
// Preserve the existing scheme dimensions and drawings; paint only name text white.
ObjC.import('Foundation');
ObjC.import('PDFKit');
ObjC.import('AppKit');

function read(path) {
  return ObjC.unwrap($.NSString.stringWithContentsOfFileEncodingError(path, $.NSUTF8StringEncoding, null));
}
function data(path, declaration) {
  return JSON.parse(read(path).split(declaration + ' = ')[1].trim().replace(/;$/, ''));
}
function write(path, value) {
  if (!$(value).writeToFileAtomicallyEncodingError(path, true, $.NSUTF8StringEncoding, null)) throw Error('Cannot write ' + path);
}
function normalize(word) {
  return word.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}
function words(text) {
  return text.match(/[a-z\u00c0-\u024f\ufb00-\ufb06]+/gi) || [];
}
function phrasePattern(phrase) {
  // A dash may be typeset as a hyphen, en/em dash, or nonbreaking hyphen.
  return new RegExp('\\b' + phrase.replace(/-/g, '[-\u2010-\u2015]') + '\\b', 'g');
}
function imageRevision(bytes) {
  // A content-dependent URL prevents old, less thoroughly masked images from
  // surviving in the browser cache after the masking rules change.
  const encoded = ObjC.unwrap(bytes.base64EncodedStringWithOptions(0));
  let hash = 2166136261;
  for (let i=0; i<encoded.length; i++) hash = Math.imul(hash ^ encoded.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(16).padStart(8, '0');
}
function run(args) {
  const pdf = $.PDFDocument.alloc.initWithURL($.NSURL.fileURLWithPath(args[0]));
  if (!pdf) throw Error('Cannot open source PDF');
  const cards = data('assets/reactions.js', 'const reactionCatalog');
  const sections = data('assets/book-sections.js', 'const bookSections');
  const references = JSON.parse(read('scripts/flashcard-name-references.json'));
  const previous = JSON.parse(read('scripts/flashcard-masks.json'));
  const jobs = JSON.parse(read('scripts/book-section-figures.json')).concat(JSON.parse(read('scripts/book-figures.json')));
  // Keep ordinary chemical descriptions/reagents. Eponyms, aliases and distinctive
  // reaction names (e.g. aldol, pinacol, metathesis) still get masked wherever used.
  const generic = new Set(words('reaction reactions rearrangement condensation synthesis oxidation oxidations reduction coupling cross ester acid and of by for the s de von method rules guidelines ring closing expansion aza homo hetero oxy quasi retro photo anionic ortho asymmetric radical remote functionalization modification transposition reductive alkylation acylation arylation amination annulation cycloaddition photocycloaddition epoxidation cyclopropanation olefination fragmentation homologation macrolactonization dehydration deoxygenation decarboxylation carbonylative hydrolytic kinetic resolution directed metalation multicomponent transfer mediated alcohols reagents selenium dioxide chromium samarium diiodide boronic biaryl ether amine nitrite indole pyrrole furan quinoline isoquinoline dihydropyridine tetrahydroisoquinoline pyridine allene alkene alkene alkyne olefin enyne enone diene aldehyde ketone hydrazone enamine dithiane linchpin methylation formylation cyclization diazo boration hydrocyanation hydrozirconation glycosidation hydroboration aminohydroxylation dihydroxylation hydrogenation bromination decarbonylation allylation cyclopentene benzannulation dealkoxycarbonylation ketene borane glycidic').map(normalize));
  const ownTerms = card => [...new Set(words(card.name + ' ' + (card.bookName || '')).map(normalize).filter(w => !generic.has(w)))];
  // All catalog eponyms and audited off-catalog attributions apply to EVERY
  // figure. For example, Ganem must disappear from the Kornblum scheme too.
  const ordinary = new Set(references.ordinaryChemicalTerms);
  const sharedTerms = [...new Set(cards.flatMap(ownTerms).filter(w => !ordinary.has(w)).concat(Object.keys(references.additionalNames)))];
  const manifest = {}, figures = {};
  $.NSFileManager.defaultManager.createDirectoryAtPathWithIntermediateDirectoriesAttributesError('assets/flashcards', true, $({}), null);
  for (const card of cards) {
    const figure = sections[card.id].reaction;
    const job = jobs.find(j => j.file === figure.image);
    if (!job || !job.crop) throw Error('Missing explicit scheme bounds: ' + card.id);
    const terms = [...new Set([...sharedTerms, ...ownTerms(card)])].sort();
    const termSet = new Set(terms);
    if (!terms.length) throw Error('No identifying terms: ' + card.name);
    const page = pdf.pageAtIndex(figure.pdfPage - 1);
    const bounds = page.boundsForBox($.kPDFDisplayBoxMediaBox);
    const source = $.NSBitmapImageRep.alloc.initWithData($.NSData.dataWithContentsOfFile(figure.image));
    const width = Number(source.pixelsWide), height = Number(source.pixelsHigh);
    const [cx, cy, cw, ch] = job.crop;
    const text = ObjC.unwrap(page.string), masks = [];
    const pattern = /[a-z\u00c0-\u024f\ufb00-\ufb06]+/gi;
    function maskText(label, index) {
      const box = page.selectionForRange($.NSMakeRange(index, label.length)).boundsForPage(page);
      const left = (box.origin.x - bounds.origin.x) / bounds.size.width;
      const top = 1 - (box.origin.y - bounds.origin.y + box.size.height) / bounds.size.height;
      const right = left + box.size.width / bounds.size.width;
      const bottom = top + box.size.height / bounds.size.height;
      if (right <= cx || left >= cx + cw || bottom <= cy || top >= cy + ch) return;
      // Include antialiasing and italic overhang without cutting into the scheme.
      const x = Math.max(0, Math.floor((left - cx) / cw * width) - 2);
      const y = Math.max(0, Math.floor((top - cy) / ch * height) - 2);
      const x2 = Math.min(width, Math.ceil((right - cx) / cw * width) + 2);
      const y2 = Math.min(height, Math.ceil((bottom - cy) / ch * height) + 2);
      masks.push({text:label, rect:[x,y,x2-x,y2-y]});
    }
    let match;
    while ((match = pattern.exec(text))) {
      if (termSet.has(normalize(match[0])) || references.abbreviations.includes(match[0])) maskText(match[0], match.index);
    }
    for (const phrase of references.phrases) {
      const pattern = phrasePattern(phrase);
      while ((match = pattern.exec(text))) maskText(match[0], match.index);
    }
    let bytes;
    if (masks.length) {
      const white = $.NSColor.colorWithCalibratedRedGreenBlueAlpha(1, 1, 1, 1);
      for (const {rect:[x,y,w,h]} of masks) {
        for (let row=y; row<y+h; row++) {
          for (let column=x; column<x+w; column++) source.setColorAtXY(white, column, row);
        }
      }
      bytes = source.representationUsingTypeProperties($.NSBitmapImageFileTypePNG, $({}));
    } else {
      bytes = $.NSData.dataWithContentsOfFile(figure.image);
    }
    // Anonymous filenames also keep full-size URLs from giving away the answer.
    const output = 'assets/flashcards/' + String(figure.pdfPage).padStart(3, '0') + '-' + imageRevision(bytes) + '.png';
    if (!bytes.writeToFileAtomically(output, true)) throw Error('Cannot write ' + output);
    manifest[card.id] = {source:figure.image, image:output, width, height, terms, masks};
    figures[card.id] = {...figure, image:output};
  }
  write('scripts/flashcard-masks.json', JSON.stringify(manifest, null, 2) + '\n');
  write('assets/flashcard-figures.js', '// Generated by scripts/mask-flashcards.js. Name-recall figures with identifying text whited out.\nconst flashcardFigures = ' + JSON.stringify(figures, null, 2) + ';\n');
  const current = new Set(Object.values(figures).map(f => f.image));
  for (const old of Object.values(previous)) {
    if (/^assets\/flashcards\/\d+(?:-[a-f0-9]+)?\.png$/.test(old.image) && !current.has(old.image)) {
      $.NSFileManager.defaultManager.removeItemAtPathError(old.image, null);
    }
  }
  return JSON.stringify({figures:cards.length, maskedFigures:Object.values(manifest).filter(f=>f.masks.length).length, masks:Object.values(manifest).reduce((n,f)=>n+f.masks.length,0)});
}
