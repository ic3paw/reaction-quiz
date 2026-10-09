# Name Reaction Database

A responsive named-reaction study website built with plain HTML, CSS, and JavaScript. Open [index.html](./index.html) in a modern browser to get started. No build step or dependencies are required.

## Features

- 24 organic chemistry reactions in six categories
- Searchable library with reagents, conditions, and explanations
- Reaction, Mechanism, and Applications tabs with 71 book figures and printed-page citations
- Sidebar checkboxes to select multiple categories for the library and all quiz modes; selections persist in the browser
- Quick quizzes, category practice, a daily challenge, mistake review, and saved-reaction practice
- Immediate answer feedback
- Accuracy, practice history, daily streaks, and reaction mastery
- Local browser storage for bookmarks and progress
- Responsive layouts and keyboard-accessible dialogs

Progress is specific to the current browser and website origin. Three consecutive correct answers for a reaction mark it as mastered. An unfinished quiz keeps answered-question progress but does not count as a completed session. The daily challenge is selected using the local calendar date.

The interface uses Arial and system fonts, with no external assets or network requests. Reaction data and application logic are in [assets/app.js](./assets/app.js); styling is in [assets/styles.css](./assets/styles.css).

## Book figures

The figures come from the supplied copy of László Kürti and Barbara Czakó, *Strategic Applications of Named Reactions in Organic Synthesis: Background and Detailed Mechanisms* (Elsevier, 2005, as stated on the copyright page). The supplied filename dates the copy to 2009. Printed page numbers are 52 lower than the corresponding PDF page numbers.

[Book metadata](./assets/book-data.js) maps the current 24 reaction entries to cropped images in [assets/book](./assets/book/). The 23 dedicated entries have a general scheme, a mechanism section, and an applications page containing the original synthetic examples, conditions, and descriptions. Fischer esterification has no dedicated entry; its reaction/application figures come from the methyl epijasmonate example on printed page 265, within the Lieben haloform reaction chapter. Its Mechanism tab explicitly identifies this source limitation.

Click a figure or its “Full size” link to open the original image. Tabs support Left/Right arrow keys and Home/End. The images load only when their tab is opened.

The crop manifest is [scripts/book-figures.json](./scripts/book-figures.json). To regenerate figures on macOS, run from the project directory:

```sh
osascript -l JavaScript scripts/extract-book.js "/path/to/book.pdf" scripts/book-figures.json render
```

An optional final argument such as `claisen` regenerates just that reaction. The extraction script uses the built-in PDFKit framework; the website itself does not require macOS. The complete source PDF and temporary extracted text are not included in the website assets.
