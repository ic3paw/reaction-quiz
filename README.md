# Name Reaction Database

A responsive named-reaction study website built with plain HTML, CSS, and JavaScript. Open [index.html](./index.html) in a modern browser to get started. No build step or dependencies are required.

## Features

- 468 unique study entries: the original 251, 36 additions from Li (2021), and 181 additional entries from Mundy, Ellerd & Favaloro (2005), after consolidating four overlapping cards; filter by source book or view all books
- A searchable Reagents tab with 151 named reagents, catalysts, acronyms, and reference entries from Mundy et al., including structures, preparation, uses, and examples
- Searchable library with a remembered Condensed view (names and appendix overviews) or Expanded view (book reaction schemes)
- Reaction & conditions (shown first), Outline / history, Mechanism, and Synthetic applications tabs where source material is available, with book figures and printed-page citations
- Sidebar checkboxes to select multiple categories for the library and all quiz modes; selections persist in the browser
- Quick quizzes from Home, full quizzes for selected categories, endless quizzes, mistake review, and saved-reaction practice
- Immediate answer feedback
- Flashcard modes for recalling the name from a book scheme, reaction/conditions, or mechanism, with outline/history and synthetic application answer tabs, flip, shuffle, keyboard navigation, self-rating, and review of remaining cards
- Accuracy, practice history, daily streaks, and reaction mastery
- Local browser storage for bookmarks and progress
- Optional Supabase email-link accounts and private manual cloud backups; see [backend setup and design](./docs/supabase.md)
- Responsive layouts and keyboard-accessible dialogs

Progress is specific to the current browser and website origin. Three consecutive correct answers for a reaction mark it as mastered. An unfinished finite quiz keeps answered-question progress but does not count as a completed session. Ending an endless quiz saves its answered-question total and score; unanswered questions are excluded, and empty sessions are not recorded.

The interface uses Arial and system fonts, with UChicago maroon (`#800000`) accents. Guest study uses no external assets or network requests. Optional accounts load the Supabase SDK and connect to a configured Supabase project. Reaction data is in [assets/reactions.js](./assets/reactions.js), application logic is in [assets/app.js](./assets/app.js), and styling is in [assets/styles.css](./assets/styles.css).

## Categories and practice

The original 23 reaction-type categories follow appendix 8.3, printed pages 508–517. Mundy additions now use the same categories, with overlapping memberships when appropriate. Selecting multiple categories takes their union without repeating reactions. “Not listed in appendix 8.3” remains a fallback for original entries without a type assignment; Kulinkovich now has the carbocycle and carbonyl memberships supplied by its Mundy entry. The appendix’s subtypes are not separate sidebar categories. The sidebar has 24 options; use the Mundy book filter to study that source across reaction types.

The sidebar filters library results, selected-reaction quizzes, endless quizzes, and flashcards. Search and saved-reaction filters also apply when starting a quiz or flashcards from the library. Explicit category buttons on the Practice page or reaction details practice the named category directly. Quick quizzes contain up to five questions; other finite quizzes and flashcard decks include every matching reaction once. Endless quizzes shuffle the selected pool, cover each reaction once per pass, and keep reshuffling until you end the session. Consecutive repeats across passes are avoided when more than one reaction is selected. Practice offers selected-reaction, endless, mistake-review, and saved-reaction quizzes, plus individual category quizzes. Tiny quiz selections draw extra answer choices from the wider library.

Condensed library rows show only a reaction name and its brief appendix description, using the existing summary for entries omitted from the appendix. Expanded rows show the original book schemes, with lazy-loaded images and full-size links. Search, category filters, and saved reactions work in both views. Click a name to open all reaction details and save or unsave it.

Open Flashcards in the navigation and choose what to recall: Name shows the complete book reaction scheme, including reagents and conditions, with identifying names and aliases whited out wherever they occur. All 472 source name-recall figures are audited (468 unique study entries after consolidation); the whiteouts preserve the original image dimensions and do not crop the drawing. The prompt and both full-size links use the same anonymous image, and the accessible label does not reveal the name. The other recall choices are Reaction & conditions and Mechanism. Reaction & conditions centers the reaction name inside a black-bordered card using the site’s heading typography. Outline / history remains available in the reaction library and revealed answer tabs, but is no longer a recall mode; saved outline recall preferences migrate to Reaction & conditions. Flip to reveal the chosen answer, then switch between Reaction & conditions, Outline / history, Name, Mechanism, and Synthetic applications for the same reaction. The reaction figure tab is first in the tab list. Mechanism tabs and mechanism-recall decks include only entries with source mechanism figures. Synthetic applications are shown only when a source figure exists. Missing outline/history sections are omitted. The recall mode persists across category changes, navigation, and reloads, and can also be changed inside a deck opened from any page.

Flashcard ratings persist separately from quiz attempts and do not change quiz accuracy or mastery. Use Previous/Next or the arrow keys to navigate, Flip card / Flip back or Space to turn the card, and “Got it”/“Study again” to rate it. Arrow keys retain their normal behavior when the recall selector is focused. At completion, review cards marked for study or left unrated. Original bookmarks and progress are retained; the first upgrade selects all of the new appendix categories.

## Book figures

The figures come from the supplied copy of László Kürti and Barbara Czakó, *Strategic Applications of Named Reactions in Organic Synthesis: Background and Detailed Mechanisms* (Elsevier, 2005, as stated on the copyright page). The supplied filename dates the copy to 2009. Printed page numbers are 52 lower than the corresponding PDF page numbers.

[Book metadata](./assets/book-data.js) maps every card to cropped images in [assets/book](./assets/book/). [Section metadata](./assets/book-sections.js) separates the reaction schemes from the book's introductory importance/history paragraphs using 500 standalone PDF crops for the 250 dedicated chapters. Reaction & conditions opens first and shows the scheme itself; Outline / history shows the introductory paragraph separately. Full-size links open those same crops. Mechanism and Synthetic applications retain the original drawings, commentary, and synthetic examples. Baldwin’s rules is a guidelines entry rather than a single mechanism; its unavailable Mechanism tab is omitted. Fischer esterification has no dedicated entry; its reaction/application figures come from the methyl epijasmonate example on printed page 265, within the Lieben haloform reaction chapter. Its Outline / history tab identifies this source limitation; its unavailable Mechanism tab is omitted.

Short prompts use appendix descriptions, with authored summaries for omitted entries. The generator corrects the appendix’s page references for Lieben, Larock, and Ley, and description errors for Aza-[2,3]-Wittig, Reformatsky, Skraup/Doebner–Miller, and Staudinger ketene cycloaddition. The unmodified category-table descriptions and corrected chapter references remain reviewable in [scripts/appendix-categories.json](./scripts/appendix-categories.json).

Click a figure or its “Full size” link to open the original image (or the whited-out image on a name-recall prompt). Use clicks or Tab followed by Enter/Space to choose information tabs. The images load only when their tab is opened.

The crop manifest is [scripts/book-figures.json](./scripts/book-figures.json). To regenerate figures on macOS, run from the project directory:

```sh
osascript -l JavaScript scripts/extract-book.js "/path/to/book.pdf" scripts/book-figures.json render
```

An optional final argument such as `claisen` selects just that reaction. Existing images are skipped; set a job’s `skipExisting` to false to rerender it. The extraction script uses the built-in PDFKit framework; the website itself does not require macOS. The complete source PDF and temporary extracted text are not included in the website assets.

To rebuild the catalog from the source on macOS (Python 3 required):

```sh
mkdir -p .book-work
osascript -l JavaScript scripts/extract-book.js "/path/to/book.pdf" .book-work/source-pages.json
osascript -l JavaScript scripts/inspect-appendix.js "/path/to/book.pdf" .book-work/appendix-layout.json
python3 scripts/build-book.py
osascript -l JavaScript scripts/extract-book.js "/path/to/book.pdf" scripts/book-figures.json render
osascript -l JavaScript scripts/split-book-sections.js "/path/to/book.pdf"
osascript -l JavaScript scripts/mask-flashcards.js "/path/to/book.pdf"
python3 scripts/validate-book.py
```

The validator checks all chapter pages, original card IDs, appendix memberships, citations, the original 751 image files, and 500 separate reaction/history crops. The section generator uses page coordinates rather than PDF text order, which can place parts of introductory paragraphs after the mechanism heading. Its reproducible crop manifest is [scripts/book-section-figures.json](./scripts/book-section-figures.json). Add `inspect` after the PDF argument to audit section boundaries without rendering images. The original authored cards and crop metadata are preserved in the `scripts/legacy-*.json` inputs; omitted-entry summaries are in [scripts/book-supplements.json](./scripts/book-supplements.json).

Name-recall assets are generated by [scripts/mask-flashcards.js](./scripts/mask-flashcards.js). It searches every figure for the complete catalog of names plus the related-reaction attributions, named modifications, and abbreviations in [scripts/flashcard-name-references.json](./scripts/flashcard-name-references.json), using PDF text coordinates even for small print, then paints padded white rectangles directly into copies of the existing PNGs. Common chemical descriptions remain visible. The audit manifest [scripts/flashcard-masks.json](./scripts/flashcard-masks.json) records the search terms and every mask; [assets/flashcard-figures.js](./assets/flashcard-figures.js) maps every card to its prompt. Regenerate these after changing the source figures. The validator checks coverage, dimensions, bounds, actual redaction, all four Fleming/Tamao occurrences, both Ganem labels in the Kornblum figure, and every audited supplemental name. Generated image filenames include a content revision so a browser cannot reuse a previously masked copy after the rules change. Original library and answer figures are preserved.

To check that every mask is white and every other pixel is unchanged, and independently read the resulting images at twice their resolution (including small text), run on macOS:

```sh
swiftc -O scripts/validate-flashcards.swift -o .book-work/validate-flashcards
.book-work/validate-flashcards --ocr
```

The OCR audit is written to `.book-work/flashcard-text-audit.json` for review; it checks the shared names and abbreviations rather than only the name of the card being studied. Visually reviewed formula misreadings are recorded in [scripts/flashcard-ocr-exceptions.json](./scripts/flashcard-ocr-exceptions.json), tied to an exact image revision so changes require another review.

## Li (2021) additions and book filtering

The second source is Jie Jack Li, *Name Reactions: A Collection of Detailed Mechanisms and Synthetic Applications*, sixth edition (Springer, 2021). All 186 table-of-contents rows are mapped in [scripts/li-entries.json](./scripts/li-entries.json), including combined entries and distinct subvariants. These map to 181 unique reactions: 145 existing entries and 36 additions. Collins oxidation begins on printed page 282 despite the contents listing 283. Printed page numbers are 19 lower than PDF page numbers.

Shared reactions remain one entry with their existing IDs, figures, bookmarks, and progress. They appear under either book filter; figure captions and entry citations identify the actual source. The Li filter denotes book coverage, not a switch to alternate figures for existing entries. It applies to the library, saved reactions, quizzes (including explicit category buttons), and flashcards. Counts update with the chosen book and category combination; all-time statistics remain cumulative.

The additions use book schemes, introductory prose, mechanisms, and examples in [assets/li](./assets/li/), described by [assets/li-data.js](./assets/li-data.js). Categories are assigned by reaction type using the existing category vocabulary. Unavailable sections are omitted. All 36 Li additions, and all 181 Li-covered reactions, have mechanism figures available in reaction details and mechanism flashcards. For Collins, PCC, and PDC oxidations, the reaction figure is a labeled book example; their Mechanism tabs use Li’s shared chromium(VI) oxidation pathway from printed page 279, where Li explicitly relates these reagents to Jones oxidation. A source note distinguishes the illustrated Jones conditions from each reagent’s own conditions and products. The crop manifest records the mechanism’s source page independently from the entry’s starting page. Siloxy-Cope and Ferrier carbocyclization show their mechanism within the reaction scheme itself.

To regenerate the Li additions (Python with PyMuPDF and Pillow; macOS Vision OCR):

```sh
python3 scripts/build-li.py "/path/to/li.pdf" --prepare-ocr
swift scripts/ocr-li-figures.swift
python3 scripts/build-li.py "/path/to/li.pdf" --mask-only
python3 scripts/validate-li.py
swiftc -O scripts/validate-flashcards.swift -o .book-work/validate-flashcards
.book-work/validate-flashcards --ocr
```

The initial preparation creates source figures for OCR; the final import requires OCR for all additions. Li uses vector lettering that is absent from PDF text extraction, so the importer combines PDF text coordinates with OCR word coordinates and a visual review. [scripts/li-flashcard-masks.json](./scripts/li-flashcard-masks.json) records each white rectangle; source crops and prompt images retain identical dimensions. Acronyms are case-sensitive so ordinary chemical symbols such as Br remain visible. The shared label vocabulary also applies to the first book; regenerate its masks after changing that vocabulary. The final pixel/OCR validator covers both books together.

Reaction details include vertically centered previous/next arrows and a position counter. Navigation follows the filtered library or saved list captured when opening the dialog, retains the active section when available, and falls back to Reaction & conditions otherwise. Left/Right keys navigate reactions even when a details tab is focused. Information tabs use clicks or Tab followed by Enter/Space; arrow keys never switch sections. The arrows stay centered while the information panel scrolls. Navigation stops at the list boundaries.


## Mundy reactions and reagent reference

The supplied source is Bradford P. Mundy, Michael G. Ellerd, and Frank G. Favaloro Jr., *Name Reactions and Reagents in Organic Synthesis*, second edition (Wiley, 2005). Printed pages are 18 lower than PDF page numbers. The scanned PDF stays outside the site; selected crops ship in [assets/mundy](./assets/mundy/) and [assets/reagents](./assets/reagents/).

[Reaction manifest](./scripts/mundy-entries.json) records reviewed names, aliases, existing-library matches, and crop boundaries for dedicated chapters and illustrated survey entries. The source import retains 185 supplemental records and coverage for 406 source IDs. The study catalog consolidates four overlapping cards, leaving 181 additional study entries and 403 unique entries covered by Mundy. All additions have reviewed memberships in the existing reaction-type categories, stored in the manifest and used by the importer. The Mundy book filter denotes source coverage, as with Li. A former Mundy-only category selection becomes all categories with the Mundy book filter; custom type selections and intentionally empty selections stay intact. Mixed selections expand to the categories used by Mundy.

Reaction crops retain their source drawings. Mechanisms use the separate proposed-mechanism section where present, or a clearly labeled shared scheme when the book draws the pathway inside the reaction figure. Unavailable sections are omitted. Notes and synthetic applications are imported where supplied. The 70 illustrated survey additions have independently reviewed region boundaries; names that are only passing references are not treated as independent entries. Corrected OCR spellings are recorded in the manifest. [Catalog consolidation](./assets/catalog.js) merges the duplicate Kulinkovich card into Kulinkovich, Ganem into the existing Kornblum/Ganem entry, Smith into the existing Madelung/Smith entry, and Borsche–Drechsel into Fischer indolization. Distinct transformations and variants remain separate. Merged names stay searchable, and their source schemes, mechanisms, notes, and applications remain accessible inside the retained entry. Book coverage is combined; retained entries keep their original IDs and primary figures. Browser upgrades and cloud restores remap bookmarks and every quiz attempt, retain session history, and keep the most recent flashcard rating when two IDs merge.

The Reagents navigation tab is independent of reaction category/book selections. Its [manifest](./scripts/mundy-reagents.json) contains 151 entries covering every printed reagent page, 715–871, with six continuation pages grouped into their parent entry. Search accepts names, reviewed chemical aliases and acronyms, and the source text. Open a reagent to see the original reference figures and citations; the centered arrow buttons or Left/Right keys follow the current search results. Escape closes the dialog. No reaction progress is changed by browsing reagents.

[Generated data](./assets/mundy-data.js) includes reaction metadata, figures, coverage, anonymous prompts, and the reagent catalog. To regenerate (Python with PyMuPDF and Pillow; macOS Vision for OCR):

```sh
python3 scripts/build-mundy.py "/path/to/mundy.pdf" --prepare-ocr
swift scripts/ocr-mundy.swift
python3 scripts/build-mundy.py "/path/to/mundy.pdf"
python3 scripts/validate-mundy.py
```

The OCR helper records page-relative word bounds so identifying names can be whitened without cropping molecular structures. The [figure manifest](./scripts/mundy-figures.json) records every source page and crop, and the [prompt mask manifest](./scripts/mundy-flashcard-masks.json) records every whiteout. The validator checks IDs against both earlier catalogs, citations, source coverage, reagent continuation pages, every image, and pixel equality outside the masks. The website remains static; guest study needs no external runtime dependencies or network access.

Catalog consolidation and migration regression tests (Node.js):

```sh
node --test tests/catalog.test.js
```
