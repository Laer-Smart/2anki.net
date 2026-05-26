import type { LandingCopy } from '../LandingPage/types';
import { ankiFidelityProof } from '../LandingPage/copy/ankiFidelityProof';

const notionToAnki: LandingCopy = {
  pathname: '/convert/notion-to-anki',
  title: 'Notion to Anki — decks that open clean in Anki | 2anki',
  description:
    'Convert any Notion page to an Anki deck that opens clean — cloze stays clickable, images render, toggles become cards. Paste a link, get a .apkg.',
  h1: 'Notion to Anki — turn your notes into flashcards',
  subhead:
    'Connect Notion once, paste any page link, get a .apkg deck. Toggles become cards. No add-on, no copy-pasting.',
  whatComesAcross: ankiFidelityProof,
  faqs: [
    {
      q: 'How do I connect my Notion workspace?',
      a: 'Sign in to 2anki, go to the upload page, and click "Connect Notion". You authorise read access once — we use it only to read pages you select.',
    },
    {
      q: 'Which Notion block types become cards?',
      a: 'Toggle blocks are the primary card source: the toggle heading becomes the front, the body becomes the back. Strikethrough text in the page body is turned into a tag on every card in that deck.',
    },
    {
      q: 'Do images and code blocks survive the conversion?',
      a: "Both come across. Images embed in the card, code blocks keep their formatting. Anything we can't fetch is replaced with a short note so the card still works.",
    },
    {
      q: 'Can I re-convert a page after editing it in Notion?',
      a: 'Yes — paste the same link again to get a fresh deck. If you want edits to sync automatically every few minutes, see Auto Sync on the pricing page.',
    },
  ],
};

const pdfToAnki: LandingCopy = {
  pathname: '/convert/pdf-to-anki',
  title: 'PDF to Anki — flashcards that work in Anki | 2anki',
  description:
    'Turn a PDF into an Anki deck that imports clean — correct note types, images embedded, headings as decks. Drop a file, get a .apkg.',
  h1: 'PDF to Anki — make flashcards from lecture slides',
  subhead:
    'Drop a PDF and download a .apkg deck. Works with lecture notes, textbook chapters, and exported slides.',
  whatComesAcross: ankiFidelityProof,
  faqs: [
    {
      q: 'Will it read a scanned PDF?',
      a: 'Only if the scan includes a text layer. Most modern textbook exports and slide PDFs do. For a photo scan with no text, run it through OCR in macOS Preview or Adobe Acrobat first.',
    },
    {
      q: 'How does it decide what becomes a card?',
      a: 'Headings name the deck and subdeck. Top-level bullets become card fronts; the next indent level or line becomes the back. You can edit the cards in Anki after — nothing is locked.',
    },
    {
      q: 'Can I upload a whole textbook?',
      a: 'Yes. Large PDFs work, though big files take longer and create large decks. Uploading one chapter at a time keeps decks easier to review and share.',
    },
    {
      q: 'What happens to equations and diagrams?',
      a: 'Diagrams come across as embedded images. Equations stored as images stay as images. Equations stored as text need MathJax enabled in your Anki card template to render.',
    },
  ],
};

const markdownToAnki: LandingCopy = {
  pathname: '/convert/markdown-to-anki',
  title: 'Markdown to Anki — decks that open clean in Anki | 2anki',
  description:
    'Convert Markdown or Obsidian notes to an Anki deck that opens clean — code blocks intact, cloze clickable, bullets become cards.',
  h1: 'Markdown to Anki — convert .md files and Obsidian notes',
  subhead:
    'Drop a .md file and download a deck — bullets, Q/A pairs, and code blocks all come across.',
  whatComesAcross: ankiFidelityProof,
  faqs: [
    {
      q: 'How does it turn Markdown into cards?',
      a: 'Top-level bullets become card fronts; a nested bullet underneath becomes the answer. The first heading names the deck. A full guide is in the docs.',
    },
    {
      q: 'Can I write Q/A pairs instead of using bullet nesting?',
      a: "Yes — write 'Q: question' followed by 'A: answer' on the next line and we detect the pattern automatically. Mix Q/A and bullet-style cards in the same file.",
    },
    {
      q: 'Does Obsidian-flavoured Markdown work?',
      a: 'Standard Obsidian formatting — bullets, headings, bold, italic, code blocks — converts cleanly. Obsidian-specific syntax like block embeds and graph links is ignored rather than erroring.',
    },
    {
      q: 'What about LaTeX and code blocks?',
      a: 'Triple-backtick code blocks come across as text inside the card. LaTeX inside $...$ and $$...$$ renders if MathJax is enabled in your Anki card template settings.',
    },
  ],
};

const csvToAnki: LandingCopy = {
  pathname: '/convert/csv-to-anki',
  title: 'CSV to Anki — spreadsheets to clean Anki decks | 2anki',
  description:
    'Import a CSV or Excel sheet as an Anki deck that opens clean — correct fields, tags applied, one row per card.',
  h1: 'CSV to Anki — import spreadsheets as flashcard decks',
  subhead:
    'Drop a .csv file and get a .apkg deck. Column A becomes the front, column B becomes the back. Works with Excel exports too.',
  whatComesAcross: ankiFidelityProof,
  faqs: [
    {
      q: 'What format does the CSV need to be in?',
      a: 'Two columns minimum: front in column A, back in column B. A header row is detected and skipped automatically. UTF-8 encoding works best for accented characters and CJK text.',
    },
    {
      q: 'Can I import an Excel .xlsx file directly?',
      a: 'Yes — upload the .xlsx file and we convert it. If the spreadsheet has multiple sheets, the first sheet is used.',
    },
    {
      q: 'How do I name the deck?',
      a: 'The deck name comes from the filename — rename the file before uploading and the deck will match. You can also rename the deck inside Anki after importing.',
    },
    {
      q: 'Can I add tags from the spreadsheet?',
      a: 'Add a third column with a tag or comma-separated tags and they attach to every card from that row. Leave the column empty to skip tagging.',
    },
  ],
};

const htmlToAnki: LandingCopy = {
  pathname: '/convert/html-to-anki',
  title: 'HTML to Anki — web pages to clean Anki decks | 2anki',
  description:
    'Convert an HTML file to an Anki deck that opens clean — images embedded, tables row by row, headings as decks.',
  h1: 'HTML to Anki — turn web pages into flashcard decks',
  subhead:
    'Drop an .html file and download a .apkg deck. Headings, bullets, and tables all come across.',
  whatComesAcross: ankiFidelityProof,
  faqs: [
    {
      q: 'Where does the HTML come from?',
      a: 'Save a web page from your browser (File → Save As → Webpage, Complete or HTML Only), or export notes from an app that exports HTML. Drop the file here and we convert it.',
    },
    {
      q: 'Which HTML elements become cards?',
      a: 'H1 and H2 headings name decks and subdecks. List items and short paragraphs become card fronts; the next sibling block becomes the back. Tables are converted row by row.',
    },
    {
      q: 'Do inline styles and images survive?',
      a: "Images embedded in the page come across. Most inline styles are stripped — the cards use Anki's own card template styling instead.",
    },
    {
      q: 'Can I use a Notion HTML export?',
      a: 'Yes. If you export a Notion page as HTML (from the Notion desktop app), upload the zip file here and we process the full export including images.',
    },
  ],
};

const apkgToCsv: LandingCopy = {
  pathname: '/convert/apkg-to-csv',
  title: 'Anki deck to CSV — export cards to a spreadsheet | 2anki',
  description:
    'Upload an .apkg file and download a CSV with every card. Edit in Excel or Google Sheets, then import back into Anki.',
  h1: 'Anki deck to CSV — export cards to a spreadsheet',
  subhead:
    'Drop an .apkg file and download a CSV. Every card front, back, and tag in one spreadsheet you can edit.',
  faqs: [
    {
      q: 'Why would I export to CSV?',
      a: "To bulk-edit cards in a spreadsheet, share the deck content with someone who doesn't use Anki, or migrate cards to another tool. The CSV is plain text — any spreadsheet app opens it.",
    },
    {
      q: 'What columns does the CSV have?',
      a: 'Front, Back, and Tags at minimum. Cloze deletion cards export with the full cloze markup intact so you can re-import them later.',
    },
    {
      q: 'Can I edit the CSV and import it back into Anki?',
      a: "Yes. Edit in Excel or Google Sheets, save as CSV, and import using Anki's built-in File → Import. Match the note type and field order when importing.",
    },
    {
      q: 'Does it work with shared and downloaded decks?',
      a: 'Any .apkg file works — decks you made yourself, decks from AnkiWeb, or decks shared by others. We read the file; there is no connection to AnkiWeb.',
    },
  ],
};

const notionTablesToAnki: LandingCopy = {
  pathname: '/convert/notion-tables-to-anki',
  title: 'Notion tables to Anki — one row, one card | 2anki',
  description:
    'Convert a Notion table into Anki flashcards. Column 1 becomes the front, column 2 becomes the back. Download a .apkg deck.',
  h1: 'Notion tables to Anki — one row, one card',
  subhead:
    'Paste a Notion page with a table. Column 1 becomes the front, column 2 becomes the back.',
  faqs: [
    {
      q: 'What if my table has more than two columns?',
      a: 'Columns 3 and beyond show up on the back of the card as a small inline table, below the main answer. Use it for example sentences, mnemonics, or notes.',
    },
    {
      q: 'Does the header row become a card?',
      a: 'If Notion\'s "header row" toggle is on for that table, we skip it. Otherwise the first row becomes a card like the rest — you can delete it in Anki.',
    },
    {
      q: 'Can I keep using toggles too?',
      a: 'Yes. Tables, toggles, and headings can all source cards from the same page. The Rules page lets you turn each one on or off.',
    },
    {
      q: 'Will images inside cells convert?',
      a: 'Not yet — image-in-cell support is on the roadmap. For now, cells with only an image render as empty; cells with text + image keep the text.',
    },
  ],
};

const lingvistToAnki: LandingCopy = {
  pathname: '/convert/lingvist-to-anki',
  title: 'Lingvist to Anki — move your flashcards to Anki | 2anki',
  description:
    'Move your Lingvist flashcards to Anki. Export your vocabulary as a CSV, upload it here, and download a .apkg deck that opens clean.',
  h1: 'Move your Lingvist flashcards to Anki',
  subhead:
    'Export your Lingvist vocabulary as a CSV, drop it here, and get a .apkg deck. Your words and translations come across as basic cards.',
  whatComesAcross: ankiFidelityProof,
  faqs: [
    {
      q: 'How do I export from Lingvist?',
      a: 'Go to your Lingvist account settings and look for the vocabulary export option. It downloads a CSV with your words and translations.',
    },
    {
      q: 'Which columns does Lingvist export?',
      a: 'The CSV typically has the target word in one column and the translation in another. Column A becomes the card front, column B becomes the back.',
    },
    {
      q: 'Will my progress and statistics transfer?',
      a: 'Card content transfers — the word and translation. Lingvist progress data stays in Lingvist. Anki will schedule the imported cards from scratch using its own spaced repetition algorithm.',
    },
    {
      q: 'Can I keep using Lingvist and Anki together?',
      a: 'Yes. Export again any time to get an updated deck with your newest vocabulary. Re-import into Anki to add the new cards.',
    },
  ],
};

const studystackToAnki: LandingCopy = {
  pathname: '/convert/studystack-to-anki',
  title: 'StudyStack to Anki — move your flashcards to Anki | 2anki',
  description:
    'Move your StudyStack flashcards to Anki. Export your stack as a CSV or text file, upload it here, and download a .apkg deck.',
  h1: 'Move your StudyStack flashcards to Anki',
  subhead:
    'Export your StudyStack as a CSV, drop it here, and get a .apkg deck. Terms and definitions become basic cards ready to review in Anki.',
  whatComesAcross: ankiFidelityProof,
  faqs: [
    {
      q: 'How do I export from StudyStack?',
      a: 'Open your stack, go to the stack settings or export menu, and choose CSV or text export. The file will have your terms and definitions.',
    },
    {
      q: 'What format does the exported file use?',
      a: 'StudyStack exports a two-column file — term in the first column, definition in the second. That maps directly to card front and back.',
    },
    {
      q: 'Do images and audio come across?',
      a: 'Plain text and simple HTML in your cards transfers. Images attached inside StudyStack cards are not included in the CSV export.',
    },
    {
      q: 'How many cards can I import?',
      a: 'Free accounts convert up to 100 cards per month. Unlimited and Auto Sync plans remove the cap — see the pricing page.',
    },
  ],
};

const zorbiToAnki: LandingCopy = {
  pathname: '/convert/zorbi-to-anki',
  title: 'Zorbi to Anki — move your flashcards to Anki | 2anki',
  description:
    'Move your Zorbi flashcards to Anki. Export your deck as a CSV, upload it here, and download a .apkg deck that opens clean.',
  h1: 'Move your Zorbi flashcards to Anki',
  subhead:
    'Export your Zorbi deck as a CSV, drop it here, and get a .apkg deck. Questions and answers become basic Anki cards.',
  whatComesAcross: ankiFidelityProof,
  faqs: [
    {
      q: 'How do I export from Zorbi?',
      a: 'In Zorbi, open your deck and use the export option to download a CSV. The file contains your card fronts and backs.',
    },
    {
      q: 'Do cloze deletions transfer?',
      a: 'If your Zorbi cards use cloze-style blanks and the export includes the full text with markup, those cards will convert as cloze notes in Anki. Plain Q/A cards convert as basic notes.',
    },
    {
      q: 'Will my review history carry over?',
      a: 'Card content transfers — the question and answer. Review history and scheduling data stays in Zorbi. Anki reschedules imported cards from the beginning.',
    },
    {
      q: 'Can I import a Zorbi deck shared by someone else?',
      a: "Yes, if you have access to export the shared deck. Download the CSV from Zorbi, then upload it here. The deck name comes from the filename — rename it before uploading if you'd like a different name.",
    },
  ],
};

export const CONVERT_LANDING_PAGES: ReadonlyMap<string, LandingCopy> = new Map([
  ['notion-to-anki', notionToAnki],
  ['pdf-to-anki', pdfToAnki],
  ['markdown-to-anki', markdownToAnki],
  ['csv-to-anki', csvToAnki],
  ['html-to-anki', htmlToAnki],
  ['apkg-to-csv', apkgToCsv],
  ['notion-tables-to-anki', notionTablesToAnki],
  ['lingvist-to-anki', lingvistToAnki],
  ['studystack-to-anki', studystackToAnki],
  ['zorbi-to-anki', zorbiToAnki],
]);
