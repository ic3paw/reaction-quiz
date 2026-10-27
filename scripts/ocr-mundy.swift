// macOS: swift scripts/ocr-mundy.swift
// Recognize scanned reaction pages for section boundaries and anonymous prompts.
import Foundation
import CoreGraphics
import ImageIO
import Vision
struct Job: Decodable { let page: Int; let image: String }
struct TextBox: Codable { let text: String; let rect: [Double] }
struct Audit: Codable { let lines: [TextBox]; let words: [TextBox] }
let inputPath = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : ".book-work/mundy-ocr-jobs.json"
let output = URL(fileURLWithPath:CommandLine.arguments.count > 2 ? CommandLine.arguments[2] : ".book-work/mundy-ocr.json")
let jobs = try JSONDecoder().decode([Job].self, from: Data(contentsOf: URL(fileURLWithPath:inputPath)))
var audits = (try? JSONDecoder().decode([String:Audit].self, from: Data(contentsOf:output))) ?? [:]
let pattern = try NSRegularExpression(pattern:"[\\p{L}\\p{N}]+")
for job in jobs where audits[String(job.page)] == nil {
    try autoreleasepool {
        let source = CGImageSourceCreateWithURL(URL(fileURLWithPath:job.image) as CFURL,nil)!
        let image = CGImageSourceCreateImageAtIndex(source,0,nil)!
        let request = VNRecognizeTextRequest()
        request.recognitionLevel = .accurate
        request.usesLanguageCorrection = false
        request.minimumTextHeight = 0
        try VNImageRequestHandler(cgImage:image).perform([request])
        var lines:[TextBox] = [], words:[TextBox] = []
        for result in request.results ?? [] {
            guard let text = result.topCandidates(1).first else { continue }
            let r = result.boundingBox
            lines.append(TextBox(text:text.string,rect:[r.minX,1-r.maxY,r.width,r.height]))
            for match in pattern.matches(in:text.string,range:NSRange(text.string.startIndex...,in:text.string)) {
                guard let range=Range(match.range,in:text.string),let box=try text.boundingBox(for:range) else { continue }
                let r=box.boundingBox
                words.append(TextBox(text:String(text.string[range]),rect:[r.minX,1-r.maxY,r.width,r.height]))
            }
        }
        audits[String(job.page)]=Audit(lines:lines,words:words)
    }
    let encoder=JSONEncoder();encoder.outputFormatting=[.sortedKeys]
    try encoder.encode(audits).write(to:output,options:.atomic)
    print("OCR page \(job.page)")
}
print("Recognized \(audits.count) scanned pages")
