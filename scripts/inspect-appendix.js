// macOS PDFKit extraction of appendix lines with their page coordinates.
ObjC.import('Foundation');
ObjC.import('PDFKit');
function run(args) {
  const pdf = $.PDFDocument.alloc.initWithURL($.NSURL.fileURLWithPath(args[0]));
  const pages = [];
  for (let n = 560; n <= 569; n++) {
    const page = pdf.pageAtIndex(n - 1), text = ObjC.unwrap(page.string);
    const columns = [[70,153],[153,291],[291,504],[504,541]].map(function(range) {
      const selection = page.selectionForRect($.NSMakeRect(range[0], 15, range[1]-range[0], 727));
      const selectedLines = selection.selectionsByLine;
      const lines = [];
      for (let i=0; i<Number(selectedLines.count); i++) {
        const line = selectedLines.objectAtIndex(i), b = line.boundsForPage(page);
        lines.push({text:ObjC.unwrap(line.string), x:Number(b.origin.x), y:Number(b.origin.y), w:Number(b.size.width), h:Number(b.size.height)});
      }
      return lines;
    });
    pages.push({page:n, columns:columns});
  }
  $(JSON.stringify(pages, null, 2)).writeToFileAtomicallyEncodingError(args[1], true, $.NSUTF8StringEncoding, null);
  return 'Extracted appendix layout';
}
