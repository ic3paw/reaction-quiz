# Protecting groups

The Protecting groups page indexes the supplied copy of Peter G. M. Wuts and Theodora W. Greene, *Greene’s Protective Groups in Organic Synthesis*, fourth edition (Wiley, 2007). It follows the detailed contents at the beginning of chapters 2–9: hydroxyl groups and diols; phenols and catechols; carbonyl; carboxyl (including boronic and sulfonic acids); thiol; amino (including heterocycles, amides, and sulfonamides); alkyne C–H; and phosphate.

There are 1,411 contents rows: 1,275 group listings and 136 section/general-method entries. Names that recur for different protected functionalities remain separate. The contents order is retained, including entries that share a source heading. Chapter 1 and chapter 10's reactivity charts are not additional protecting-group entries.

Search matches names, section names, and source headings (including abbreviations such as MOM, Boc, and Fmoc). Chapter and section filters are independent of the named-reaction study categories. Results are paginated in book order. Protection conditions and Deprotection conditions show the book's Formation and Cleavage excerpts, respectively. Combined Formation/Cleavage schemes appear in both tabs. Source & notes includes the original entry and its supporting references. Source images load only when a detail is opened.

Some entries have no separate Formation or Cleavage heading, and some uncommon groups are listed only with literature references. In those cases the interface explicitly shows the original discussion, scheme, or reference listing; it does not invent a procedure or imply that the book gives conditions it does not provide. These are source excerpts, not newly transcribed chemical protocols.

## Source and generation

- [Catalog and source ranges](../scripts/protecting-groups.json)
- [Reviewed heading exceptions](../scripts/protecting-groups-overrides.json)
- [Generator](../scripts/build-protecting-groups.py)
- [Published data](../assets/protecting-groups-data.js)
- [Cropped page images](../assets/protecting-groups/)
- [Interface](../assets/protecting-groups.js)

Printed page *n* corresponds to one-based PDF page *n + 27*. The generator reads each chapter's contents using its typography, locates headings in the body, and derives Formation/Cleavage ranges. Reviewed exceptions handle abbreviated/misspelled contents headings and continuation-page references. Adjacent group headings with shared procedures retain their shared methods.

The image crop is `[44, 61, 414, 630]` in PDF points, rendered at 3× into lossless WebP. It excludes the right-hand download notice (which begins at x = 424.6), while preserving body text and diagrams. Whole cropped pages are shared by entries; the interface displays the relevant vertical regions. Full source links open the same cropped page, so they do not reintroduce the download notice. The original PDF is not copied to the website. The 932 shared source images total about 74 MB.

To rebuild, use Python with PyMuPDF and Pillow installed:

```sh
python scripts/build-protecting-groups.py "/path/to/Greenes-2007.pdf" --render
python scripts/validate-protecting-groups.py "/path/to/Greenes-2007.pdf"
```

The validator checks chapter coverage/order, source bounds, every published image, representative Formation/Cleavage ranges, shared methods, and reference-only handling. With the PDF supplied, it also checks every used page for body-text clipping and download-notice exclusion.

With a local server on port 8765, run the browser checks:

```sh
python tests/protecting-groups-browser.py
```
