// Run with macOS JavaScript for Automation: osascript -l JavaScript.
ObjC.import('Foundation');
ObjC.import('PDFKit');
ObjC.import('AppKit');

function run(args) {
  const document = $.PDFDocument.alloc.initWithURL($.NSURL.fileURLWithPath(args[0]));
  if (!document) throw new Error('Could not open PDF');
  const output = args[1];
  const count = Number(document.pageCount);
  if (args[2] === 'render') {
    const jobs = JSON.parse(ObjC.unwrap($.NSString.stringWithContentsOfFileEncodingError(output, $.NSUTF8StringEncoding, null)))
      .filter(job => !args[3] || job.file.indexOf('/' + args[3] + '-') !== -1);
    const results = [];
    for (const job of jobs) {
      const page = document.pageAtIndex(job.page - 1);
      const bounds = page.boundsForBox($.kPDFDisplayBoxMediaBox);
      page.setBoundsForBox(bounds, $.kPDFDisplayBoxCropBox);
      const width = bounds.size.width, height = bounds.size.height;
      const sourceText = page.string ? ObjC.unwrap(page.string) : '';
      const markers = {};
      for (const marker of ['Importance:', 'Mechanism:', 'Synthetic Applications:']) {
        const index = sourceText.indexOf(marker);
        if (index !== -1) {
          const box = page.selectionForRange($.NSMakeRange(index, marker.length)).boundsForPage(page);
          markers[marker] = {top:1 - (box.origin.y + box.size.height) / height, bottom:1 - box.origin.y / height};
        }
      }
      let crop = job.crop || [0, 0, 1, 1];
      if (job.region === 'overview') {
        if (!markers['Importance:'] || !markers['Mechanism:']) throw new Error('Missing overview markers for ' + job.file);
        const top = markers['Importance:'].top - 0.005;
        const bottom = markers['Mechanism:'].top - 0.006;
        crop = [0.11, top, 0.78, bottom - top];
      } else if (job.region === 'reaction') {
        const index = sourceText.indexOf(job.introEnd);
        if (index < 0 || !markers['Mechanism:']) throw new Error('Missing crop marker for ' + job.file);
        const endBox = page.selectionForRange($.NSMakeRange(index, job.introEnd.length)).boundsForPage(page);
        const top = 1 - endBox.origin.y / height + 0.007;
        const bottom = markers['Mechanism:'].top - 0.006;
        if (bottom <= top) throw new Error('Invalid crop for ' + job.file);
        crop = [0.11, top, 0.78, bottom - top];
      } else if (job.region === 'mechanism') {
        if (!markers['Mechanism:']) throw new Error('Missing mechanism for ' + job.file);
        const top = markers['Mechanism:'].top - 0.005;
        crop = [0.11, top, 0.78, 0.975 - top];
      }
      const rect = $.NSMakeRect(bounds.origin.x + crop[0] * width, bounds.origin.y + (1 - crop[1] - crop[3]) * height, crop[2] * width, crop[3] * height);
      page.setBoundsForBox(rect, $.kPDFDisplayBoxCropBox);
      if (job.skipExisting && $.NSFileManager.defaultManager.fileExistsAtPath(job.file)) continue;
      const scale = job.scale || 2.5;
      const image = page.thumbnailOfSizeForBox($.NSMakeSize(rect.size.width * scale, rect.size.height * scale), $.kPDFDisplayBoxCropBox);
      const bitmap = $.NSBitmapImageRep.imageRepWithData(image.TIFFRepresentation);
      const data = bitmap.representationUsingTypeProperties($.NSBitmapImageFileTypePNG, $({}));
      if (!data.writeToFileAtomically(job.file, true)) throw new Error('Could not write ' + job.file);
      results.push({page:job.page, file:job.file, width:width, height:height, crop:crop, markers:markers});
      console.log('Rendered ' + job.file);
    }
    $(JSON.stringify(results, null, 2)).writeToFileAtomicallyEncodingError(output + '.results.json', true, $.NSUTF8StringEncoding, null);
    return JSON.stringify({rendered:results.length, metadata:output + '.results.json'});
  }
  if (args[2] === 'inspect') {
    const sample = [];
    for (let i = 0; i < Math.min(20, count); i++) {
      const page = document.pageAtIndex(i);
      sample.push({page:i + 1, text:page.string ? ObjC.unwrap(page.string) : ''});
    }
    return JSON.stringify({pageCount:count, sample:sample});
  }
  console.log('Extracting ' + count + ' pages');
  const pages = [];
  for (let i = 0; i < count; i++) {
    const page = document.pageAtIndex(i);
    pages.push({page: i + 1, text: page.string ? ObjC.unwrap(page.string) : ''});
    if (i % 50 === 49) console.log('Read ' + (i + 1) + ' pages');
  }
  const text = $(JSON.stringify({pageCount: count, pages}, null, 2));
  if (!text.writeToFileAtomicallyEncodingError(output, true, $.NSUTF8StringEncoding, null)) {
    throw new Error('Could not write extracted text');
  }
  return JSON.stringify({pageCount: count, output: output, firstPages: pages.slice(0, 3)});
}
