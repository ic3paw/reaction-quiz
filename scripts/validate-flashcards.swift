// macOS: swift scripts/validate-flashcards.swift [--ocr]
// Checks every pixel, then optionally reads all small text with 2x-resolution OCR.
import Foundation
import CoreGraphics
import ImageIO
import Vision

struct Mask: Decodable { let text: String; let rect: [Int] }
struct Figure: Decodable {
    let source: String; let image: String
    let width: Int; let height: Int
    let terms: [String]; let masks: [Mask]
}
struct References: Decodable { let abbreviations: [String]; let phrases: [String] }
struct OCRException: Decodable { let id: String; let image: String; let term: String; let reason: String }
struct Audit: Encodable {
    let id: String; let image: String; let remaining: [String]
    let reviewedReadings: [String]; let lines: [String]
}

func read<T: Decodable>(_ path: String) throws -> T {
    try JSONDecoder().decode(T.self, from: Data(contentsOf: URL(fileURLWithPath: path)))
}
func image(_ path: String) -> CGImage {
    guard let source = CGImageSourceCreateWithURL(URL(fileURLWithPath: path) as CFURL, nil),
          let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else { fatalError("Cannot read \(path)") }
    return image
}
func context(width: Int, height: Int) -> CGContext {
    CGContext(data: nil, width: width, height: height, bitsPerComponent: 8,
              bytesPerRow: width * 4, space: CGColorSpaceCreateDeviceRGB(),
              bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
}
func normalized(_ value: String) -> String {
    value.folding(options: [.diacriticInsensitive, .widthInsensitive], locale: Locale(identifier: "en_US_POSIX")).lowercased()
}
func tokens(_ value: String) -> [String] {
    value.components(separatedBy: CharacterSet.letters.inverted).filter { !$0.isEmpty }
}

var figures: [String: Figure] = try read("scripts/flashcard-masks.json")
let liFigures: [String: Figure] = try read("scripts/li-flashcard-masks.json")
figures.merge(liFigures) { _, _ in fatalError("Duplicate reaction ID") }
let references: References = try read("scripts/flashcard-name-references.json")
let exceptions: [OCRException] = try read("scripts/flashcard-ocr-exceptions.json")
let useOCR = CommandLine.arguments.contains("--ocr")
var audits: [Audit] = []
var failures: [String] = []
var checked = 0
for id in figures.keys.sorted() {
    try autoreleasepool {
        let f = figures[id]!, original = image(f.source), masked = image(f.image)
        precondition(original.width == masked.width && original.height == masked.height, "Resized: \(id)")
        precondition(masked.width == f.width && masked.height == f.height, "Wrong dimensions: \(id)")
        let a = context(width: f.width, height: f.height), b = context(width: f.width, height: f.height)
        let bounds = CGRect(x: 0, y: 0, width: f.width, height: f.height)
        a.draw(original, in: bounds); b.draw(masked, in: bounds)
        let source = a.data!.assumingMemoryBound(to: UInt8.self), output = b.data!.assumingMemoryBound(to: UInt8.self)
        var covered = [Bool](repeating: false, count: f.width * f.height)
        for mask in f.masks {
            let r = mask.rect
            for y in r[1]..<(r[1]+r[3]) { for x in r[0]..<(r[0]+r[2]) { covered[y*f.width+x] = true } }
        }
        for pixel in covered.indices {
            for channel in 0..<4 {
                let offset = pixel*4+channel
                precondition(output[offset] == (covered[pixel] ? 255 : source[offset]), "Unexpected pixel \(pixel), channel \(channel): \(id)")
            }
        }
        if useOCR {
            let enlarged = context(width: f.width*2, height: f.height*2)
            enlarged.interpolationQuality = .high
            enlarged.draw(masked, in: CGRect(x: 0, y: 0, width: f.width*2, height: f.height*2))
            let request = VNRecognizeTextRequest()
            request.recognitionLevel = .accurate
            request.usesLanguageCorrection = false
            request.minimumTextHeight = 0
            try VNImageRequestHandler(cgImage: enlarged.makeImage()!).perform([request])
            let lines = (request.results ?? []).compactMap { $0.topCandidates(1).first?.string }
            let words = Set(tokens(normalized(lines.joined(separator: " "))))
            let exactWords = Set(tokens(lines.joined(separator: " ")))
            var remaining = f.terms.filter { words.contains($0) }
            remaining += references.abbreviations.filter { exactWords.contains($0) }
            remaining += references.phrases.filter {
                let phrase = NSRegularExpression.escapedPattern(for: normalized($0)).replacingOccurrences(of: "-", with: "[-\u{2010}-\u{2015}]")
                return normalized(lines.joined(separator: " ")).range(of: "\\b" + phrase + "\\b", options: .regularExpression) != nil
            }
            // Formula strokes can resemble short acronyms. Each visually reviewed
            // exception is tied to the exact image revision and never another file.
            let reviewed = exceptions.filter { $0.id == id && $0.image == f.image && remaining.contains($0.term) }
            remaining.removeAll { term in reviewed.contains { $0.term == term } }
            audits.append(Audit(id: id, image: f.image, remaining: remaining, reviewedReadings: reviewed.map { $0.reason }, lines: lines))
            if !remaining.isEmpty { failures.append("\(id): \(remaining.joined(separator: ", "))") }
        }
        checked += 1
        if checked % 25 == 0 { print("Checked \(checked)/\(figures.count)"); fflush(stdout) }
    }
}
if useOCR {
    try FileManager.default.createDirectory(atPath: ".book-work", withIntermediateDirectories: true)
    let encoder = JSONEncoder(); encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
    try encoder.encode(audits).write(to: URL(fileURLWithPath: ".book-work/flashcard-text-audit.json"))
}
if !failures.isEmpty {
    print(failures.joined(separator: "\n")); exit(1)
}
print("PASS: \(checked) figures; all masks white; all other pixels unchanged\(useOCR ? "; no target names/abbreviations in 2x OCR" : "").")
