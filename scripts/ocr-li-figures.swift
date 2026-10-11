// macOS: swift scripts/ocr-li-figures.swift
// Capture word coordinates from vector lettering rendered into source diagrams.
import Foundation
import CoreGraphics
import ImageIO
import Vision
struct Figure: Decodable { let source: String }
struct Word: Encodable { let text: String; let rect: [Double] }
struct Audit: Encodable { let source: String; let lines: [String]; let words: [Word] }
let figures = try JSONDecoder().decode([String:Figure].self, from: Data(contentsOf: URL(fileURLWithPath:"scripts/li-flashcard-masks.json")))
let pattern = try NSRegularExpression(pattern: "[\\p{L}\\p{N}]+")
var audits: [String:Audit] = [:]
for id in figures.keys.sorted() {
    try autoreleasepool {
        let path = figures[id]!.source
        let source = CGImageSourceCreateWithURL(URL(fileURLWithPath:path) as CFURL, nil)!
        let image = CGImageSourceCreateImageAtIndex(source,0,nil)!
        let ctx = CGContext(data:nil,width:image.width*2,height:image.height*2,bitsPerComponent:8,bytesPerRow:image.width*8,space:CGColorSpaceCreateDeviceRGB(),bitmapInfo:CGImageAlphaInfo.premultipliedLast.rawValue)!
        ctx.interpolationQuality = .high
        ctx.draw(image,in:CGRect(x:0,y:0,width:image.width*2,height:image.height*2))
        let request = VNRecognizeTextRequest()
        request.recognitionLevel = .accurate; request.usesLanguageCorrection = false; request.minimumTextHeight = 0
        try VNImageRequestHandler(cgImage:ctx.makeImage()!).perform([request])
        var lines:[String] = [], words:[Word] = []
        for result in request.results ?? [] {
            guard let text = result.topCandidates(1).first else { continue }
            lines.append(text.string)
            for match in pattern.matches(in:text.string,range:NSRange(text.string.startIndex...,in:text.string)) {
                guard let range = Range(match.range,in:text.string), let observation = try text.boundingBox(for:range) else { continue }
                let r = observation.boundingBox
                words.append(Word(text:String(text.string[range]),rect:[r.minX,1-r.maxY,r.width,r.height]))
            }
        }
        audits[id] = Audit(source:path,lines:lines,words:words)
    }
}
let encoder = JSONEncoder(); encoder.outputFormatting = [.prettyPrinted,.sortedKeys]
try encoder.encode(audits).write(to:URL(fileURLWithPath:".book-work/li-diagram-ocr.json"))
print("OCR audited \(audits.count) source diagrams")
