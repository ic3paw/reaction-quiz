# Name Reaction Database

A responsive named-reaction study website built with plain HTML, CSS, and JavaScript. Open [index.html](./index.html) in a modern browser to get started. No build step or dependencies are required.

## Features

- All 250 dedicated book entries, plus the original Fischer esterification card (251 total)
- Searchable library with reagents, conditions, and explanations
- Reaction & conditions (shown first), Outline / history, Mechanism, and Synthetic applications tabs for every card, with book figures and printed-page citations
- Sidebar checkboxes to select multiple categories for the library and all quiz modes; selections persist in the browser
- Quick quizzes, full quizzes for selected categories or all reactions, a daily challenge, mistake review, and saved-reaction practice
- Immediate answer feedback
- Flashcard modes for recalling the name from a book scheme, reaction/conditions, mechanism, or outline/history, with synthetic application answer tabs, flip, shuffle, keyboard navigation, self-rating, and review of remaining cards
- Accuracy, practice history, daily streaks, and reaction mastery
- Local browser storage for bookmarks and progress
- Responsive layouts and keyboard-accessible dialogs

Progress is specific to the current browser and website origin. Three consecutive correct answers for a reaction mark it as mastered. An unfinished quiz keeps answered-question progress but does not count as a completed session. The daily challenge is selected using the local calendar date.

The interface uses Arial and system fonts, with no external assets or network requests. Reaction data is in [assets/reactions.js](./assets/reactions.js), application logic is in [assets/app.js](./assets/app.js), and styling is in [assets/styles.css](./assets/styles.css).

## Categories and practice

The 23 categories and their overlapping reaction memberships follow appendix 8.3, printed pages 508–517. Selecting multiple categories takes their union, without repeating reactions. The appendix omits 43 dedicated entries; these remain fully available under “Not listed in appendix 8.3,” alongside the supplemental Fischer esterification card. The appendix’s subtypes are not separate sidebar categories.

The sidebar filters library results, selected-reaction quizzes, daily challenges, and flashcards. Search and saved-reaction filters also apply when starting a quiz or flashcards from the library. Explicit category buttons on the Practice page or reaction details practice the named category directly. Quick quizzes and daily challenges contain up to five questions; other quizzes and flashcard decks include every matching reaction once. The Practice page also offers an explicit “All reactions” quiz covering all 251 entries regardless of sidebar selection. Tiny quiz selections draw extra answer choices from the wider library.

Open Flashcards in the navigation and choose what to recall: Name shows the actual cropped book reaction scheme, including reagents and conditions, with no text overview or reaction name in the image's accessible label. Other recall modes show the reaction name. Flip to reveal the chosen answer, then switch between Reaction & conditions, Outline / history, Name, Mechanism, and Synthetic applications for the same reaction. The reaction figure tab is first in the tab list. Mechanism answers include the book figure where available, with a source note otherwise. Synthetic applications are shown only when a source figure exists (currently all 251 cards). The recall mode persists across category changes, navigation, and reloads, and can also be changed inside a deck opened from any page.

Flashcard ratings persist separately from quiz attempts and do not change quiz accuracy or mastery. Use Previous/Next or the arrow keys to navigate, Flip card / Flip back or Space to turn the card, and “Got it”/“Study again” to rate it. Arrow keys retain their normal behavior when the recall selector is focused. At completion, review cards marked for study or left unrated. Original bookmarks and progress are retained; the first upgrade selects all of the new appendix categories.

## Book figures

The figures come from the supplied copy of László Kürti and Barbara Czakó, *Strategic Applications of Named Reactions in Organic Synthesis: Background and Detailed Mechanisms* (Elsevier, 2005, as stated on the copyright page). The supplied filename dates the copy to 2009. Printed page numbers are 52 lower than the corresponding PDF page numbers.

[Book metadata](./assets/book-data.js) maps every card to cropped images in [assets/book](./assets/book/). [Section metadata](./assets/book-sections.js) separates the reaction schemes from the book's introductory importance/history paragraphs using 500 standalone PDF crops for the 250 dedicated chapters. Reaction & conditions opens first and shows the scheme itself; Outline / history shows the introductory paragraph separately. Full-size links open those same crops. Mechanism and Synthetic applications retain the original drawings, commentary, and synthetic examples. Baldwin’s rules is a guidelines entry rather than a single mechanism; its Mechanism tab explains this. Fischer esterification has no dedicated entry; its reaction/application figures come from the methyl epijasmonate example on printed page 265, within the Lieben haloform reaction chapter. Its Outline / history and Mechanism tabs identify this source limitation.

Short prompts use appendix descriptions, with authored summaries for omitted entries. The generator corrects the appendix’s page references for Lieben, Larock, and Ley, and description errors for Aza-[2,3]-Wittig, Reformatsky, Skraup/Doebner–Miller, and Staudinger ketene cycloaddition. The unmodified category-table descriptions and corrected chapter references remain reviewable in [scripts/appendix-categories.json](./scripts/appendix-categories.json).

Click a figure or its “Full size” link to open the original image. Tabs support Left/Right arrow keys and Home/End. The images load only when their tab is opened.

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
python3 scripts/validate-book.py
```

The validator checks all chapter pages, original card IDs, appendix memberships, citations, the original 751 image files, and 500 separate reaction/history crops. The section generator uses page coordinates rather than PDF text order, which can place parts of introductory paragraphs after the mechanism heading. Its reproducible crop manifest is [scripts/book-section-figures.json](./scripts/book-section-figures.json). Add `inspect` after the PDF argument to audit section boundaries without rendering images. The original authored cards and crop metadata are preserved in the `scripts/legacy-*.json` inputs; omitted-entry summaries are in [scripts/book-supplements.json](./scripts/book-supplements.json).
