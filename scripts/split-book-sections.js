// Run: osascript -l JavaScript scripts/split-book-sections.js /path/to/book.pdf
// Crop the actual PDF drawings, separately from the introductory history.
ObjC.import('Foundation');
ObjC.import('PDFKit');
ObjC.import('AppKit');

function read(path) {
  return ObjC.unwrap($.NSString.stringWithContentsOfFileEncodingError(path, $.NSUTF8StringEncoding, null));
}
function write(path, value) {
  if (!$(value).writeToFileAtomicallyEncodingError(path, true, $.NSUTF8StringEncoding, null)) throw Error('Cannot write '+path);
}
function run(args) {
  const pdf = $.PDFDocument.alloc.initWithURL($.NSURL.fileURLWithPath(args[0]));
  if (!pdf) throw Error('Cannot open source PDF');
  const book = JSON.parse(read('assets/book-data.js').split('const bookReactions = ')[1].trim().replace(/;$/, ''));
  const only=args[2];
  if (only && !book[only]) throw Error('Unknown reaction: '+only);
  const sections = only ? JSON.parse(read('assets/book-sections.js').split('const bookSections = ')[1].trim().replace(/;$/, '')) : {};
  const review = only ? JSON.parse(read('.book-work/section-review.json')).filter(r=>r.id!==only) : [];
  const jobs = only ? JSON.parse(read('scripts/book-section-figures.json')).filter(j=>j.file!=='assets/book/'+only+'-scheme.png' && j.file!=='assets/book/'+only+'-history.png') : [];
  for (const id of Object.keys(book)) {
    if (only && id!==only) continue;
    const source = book[id], figure = source.reaction;
    if (id === 'fischer') {
      sections[id] = {
        reaction:{...figure, caption:'Reaction & conditions'},
        outlineNote:'Fischer esterification has no dedicated outline/history entry in this book. The reaction figure is the esterification step from the methyl epijasmonate synthesis on p. 265; the complete example is in Synthetic applications.'
      };
      continue;
    }
    const page = pdf.pageAtIndex(figure.pdfPage - 1);
    const bounds = page.boundsForBox($.kPDFDisplayBoxMediaBox), height = bounds.size.height, width = bounds.size.width;
    const text = ObjC.unwrap(page.string);
    function marker(label) {
      const index=text.indexOf(label);
      if (index<0) return null;
      const box=page.selectionForRange($.NSMakeRange(index,label.length)).boundsForPage(page);
      return 1-(box.origin.y+box.size.height)/height;
    }
    const start=marker('Importance:'), end=marker('Mechanism:') || 0.98;
    if (start===null) throw Error('Missing importance heading: '+id);
    const rows = [];
    let cursor = 0;
    // PDF text order is not reading order: some paragraph fragments occur after
    // the mechanism heading in the text stream. Select by page coordinates.
    for (const line of text.split('\n')) {
      if (line.trim()) {
        const box = page.selectionForRange($.NSMakeRange(cursor, line.length)).boundsForPage(page);
        const row={text:line, x:box.origin.x / width, top:1-(box.origin.y+box.size.height)/height, bottom:1-box.origin.y/height, right:(box.origin.x+box.size.width)/width};
        if (row.top>start+0.015 && row.bottom<end) rows.push(row);
      }
      cursor += line.length+1;
    }
    rows.sort((a,b)=>a.top-b.top);
    // Superscript citations can split a single printed line into multiple PDF
    // selections; merge those pieces before finding the end of the paragraph.
    const lines=[];
    for (const row of rows) {
      const previous=lines[lines.length-1];
      if (previous && row.top-previous.top<0.006) {
        previous.parts.push(row);
        previous.x=Math.min(previous.x,row.x);
        previous.right=Math.max(previous.right,row.right);
        previous.bottom=Math.max(previous.bottom,row.bottom);
      } else lines.push({...row,parts:[row]});
    }
    for (const line of lines) line.text=line.parts.sort((a,b)=>a.x-b.x).map(r=>r.text).join(' ');
    const first=lines.find(r=>r.x<0.15 && r.right-r.x>0.65 && (r.text.match(/[a-z]{3,}/g)||[]).length>8);
    if (!first) throw Error('No introductory paragraph: '+id);
    let last=first;
    for (const row of lines.slice(lines.indexOf(last)+1)) {
      if (row.top-last.bottom>0.012 || row.x>0.15) break;
      const words=(row.text.match(/[a-z]{3,}/g)||[]).length;
      const fullLine=row.right-row.x>0.65;
      const sentenceEnd=/\.[\s\d,–-]*\)?\s*$/.test(row.text);
      if (/\((?:18|19|20)\d{2}/.test(row.text) && words<8) break;
      if ((row.text.match(/:/g)||[]).length>=2 && words<12 && row.text.length<90) break;
      if (!(words>=6 || sentenceEnd || (fullLine && (words>=4 || /[,;:-](?:\s*[\d,–-]+)?\s*$/.test(row.text))))) break;
      last=row;
    }
    const split=last.bottom+0.004;
    const reactionBottom=end-0.006;
    if (reactionBottom-split<0.025) throw Error('Empty reaction crop: '+id);
    const crops={reaction:[0.11,split,0.78,reactionBottom-split],outline:[0.11,start-0.005,0.78,split-start+0.005]};
    sections[id]={};
    for (const type of Object.keys(crops)) {
      const crop=crops[type], path='assets/book/'+id+(type==='reaction' ? '-scheme.png' : '-history.png');
      const rect=$.NSMakeRect(bounds.origin.x+width*crop[0],bounds.origin.y+height*(1-crop[1]-crop[3]),width*crop[2],height*crop[3]);
      page.setBoundsForBox(rect,$.kPDFDisplayBoxCropBox);
      if (args[1]!=='inspect') {
        const image=page.thumbnailOfSizeForBox($.NSMakeSize(rect.size.width*2,rect.size.height*2),$.kPDFDisplayBoxCropBox);
        const bitmap=$.NSBitmapImageRep.imageRepWithData(image.TIFFRepresentation);
        if (!bitmap.representationUsingTypeProperties($.NSBitmapImageFileTypePNG,$({})).writeToFileAtomically(path,true)) throw Error('Cannot write '+path);
      }
      sections[id][type]={image:path,printedPage:figure.printedPage,pdfPage:figure.pdfPage,caption:type==='reaction' ? 'Reaction & conditions' : 'Outline / history'};
      jobs.push({page:figure.pdfPage,file:path,crop,scale:2});
    }
    review.push({id,split,last:last.text,next:lines.filter(r=>r.top>last.top).slice(0,3).map(r=>r.text),lines:lines.map(({parts,...row})=>row)});
  }
  if (args[1]!=='inspect') {
    write('assets/book-sections.js','// Generated by scripts/split-book-sections.js from the supplied book.\nconst bookSections = '+JSON.stringify(sections,null,2)+';\n');
    write('scripts/book-section-figures.json',JSON.stringify(jobs,null,2)+'\n');
  }
  write('.book-work/section-review.json',JSON.stringify(review,null,2));
  return JSON.stringify({sections:Object.keys(sections).length,crops:jobs.length});
}
