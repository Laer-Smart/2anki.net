import type { LandingCopy } from '../LandingPage/types';
import { ankiFidelityProof } from '../LandingPage/copy/ankiFidelityProof';

const notionToAnki: LandingCopy = {
  relatedLinks: [
    {
      label: 'Convert Notion tables to Anki',
      href: '/convert/notion-tables-to-anki',
    },
    {
      label: 'Convert Markdown and Obsidian notes to Anki',
      href: '/convert/markdown-to-anki',
    },
    { label: 'Convert a PDF to Anki', href: '/convert/pdf-to-anki' },
    { label: 'Browse every converter', href: '/convert' },
  ],
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
  relatedLinks: [
    { label: 'AI flashcard generator', href: '/ai-flashcard-generator' },
    { label: 'Convert PowerPoint slides to Anki', href: '/powerpoint-to-anki' },
    { label: 'Convert an HTML file to Anki', href: '/convert/html-to-anki' },
    {
      label: 'Convert Markdown and Obsidian notes to Anki',
      href: '/convert/markdown-to-anki',
    },
    { label: 'Convert Notion pages to Anki', href: '/convert/notion-to-anki' },
    { label: 'Browse every converter', href: '/convert' },
  ],
  pathname: '/convert/pdf-to-anki',
  title: 'Convert PDF to Anki — flashcards that work in Anki | 2anki',
  description:
    'Convert a lecture PDF, slide export, or textbook chapter into a .apkg deck. Text becomes question-and-answer cards, scanned pages become image cards, and AI mode handles dense chapters.',
  h1: 'Convert PDF to Anki — flashcards from lecture slides and textbook chapters',
  subhead:
    'Drop a lecture PDF, slide export, or textbook chapter and download a .apkg deck. 2anki reads the text into question-and-answer cards, falls back to image cards when a page has no text, and can write cards with AI when the PDF is dense.',
  whatComesAcross: ankiFidelityProof,
  faqs: [
    {
      q: 'How do text PDFs become cards?',
      a: 'When a PDF carries a text layer, 2anki reads it and pairs the pages into cards — the text on one page becomes the front, the next page becomes the back. You get editable text cards you can fix in Anki in seconds, not flattened images.',
    },
    {
      q: 'What about scanned PDFs and slide decks?',
      a: "A photo scan with no text layer can't be read as text. When there's no usable text, 2anki falls back to image cards: each page is paired with the next as a front-and-back image, so you still get a reviewable deck. For a true photo scan, add a text layer with OCR in macOS Preview or Adobe Acrobat first, then upload for text cards.",
    },
    {
      q: 'Is there an AI mode for dense chapters?',
      a: 'Yes. When a chapter is wall-to-wall prose with no clean front/back split, the AI flashcard mode reads the content and writes question-and-answer cards for you. They land as basic notes you can edit, tag, and move into a subdeck.',
    },
    {
      q: 'Can I upload a whole textbook?',
      a: 'Yes. Large PDFs work, though big files take longer and create large decks. Free accounts handle everyday lecture and chapter PDFs; paid plans lift the size limit. Uploading one chapter at a time keeps decks easier to review.',
    },
    {
      q: 'What happens to equations and diagrams?',
      a: 'Equations stored as images stay as images. Equations stored as text need MathJax enabled in your Anki card template to render. In image mode, the full page comes across as an image so diagrams stay intact.',
    },
  ],
};

const markdownToAnki: LandingCopy = {
  relatedLinks: [
    { label: 'Convert Notion pages to Anki', href: '/convert/notion-to-anki' },
    { label: 'Convert an HTML file to Anki', href: '/convert/html-to-anki' },
    { label: 'Convert a PDF to Anki', href: '/convert/pdf-to-anki' },
    { label: 'Browse every converter', href: '/convert' },
  ],
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
  relatedLinks: [
    { label: 'Export an Anki deck to CSV', href: '/convert/apkg-to-csv' },
    { label: 'Convert an HTML file to Anki', href: '/convert/html-to-anki' },
    {
      label: 'Move Brainscape flashcards to Anki',
      href: '/convert/brainscape-to-anki',
    },
    { label: 'Convert Quizlet sets to Anki', href: '/quizlet-to-anki' },
    { label: 'Browse every converter', href: '/convert' },
  ],
  pathname: '/convert/csv-to-anki',
  title: 'CSV to Anki — spreadsheets to clean Anki decks | 2anki',
  description:
    'Import a CSV or Excel sheet as an Anki deck that opens clean — correct fields, one row per card.',
  h1: 'CSV to Anki — import spreadsheets as flashcard decks',
  subhead:
    'Drop a .csv file and get a .apkg deck. Column A becomes the front, everything after A joins into the back. Works with Excel exports too.',
  whatComesAcross: ankiFidelityProof,
  faqs: [
    {
      q: 'What format does the CSV need to be in?',
      a: 'Column A is the front. Everything after A is joined into the back with spaces. Use a 2-column file for the cleanest result. A header row is detected and skipped automatically. UTF-8 encoding works best for accented characters and CJK text.',
    },
    {
      q: 'Can I import an Excel .xlsx file directly?',
      a: 'Yes — upload the .xlsx file and we convert it. If the spreadsheet has multiple sheets, the first sheet is used. A header row that looks like labels (short non-numeric text in every column) is detected and skipped.',
    },
    {
      q: 'How do I name the deck?',
      a: 'The deck name comes from the filename — rename the file before uploading and the deck will match. You can also rename the deck inside Anki after importing.',
    },
    {
      q: 'Where do tags come from?',
      a: "v1 doesn't add tags from CSV columns. To tag cards, edit them in Anki after import, or paste the deck through Notion where strikethrough text becomes a tag on every card.",
    },
  ],
};

const htmlToAnki: LandingCopy = {
  relatedLinks: [
    { label: 'Convert Notion pages to Anki', href: '/convert/notion-to-anki' },
    {
      label: 'Convert Markdown and Obsidian notes to Anki',
      href: '/convert/markdown-to-anki',
    },
    { label: 'Convert a PDF to Anki', href: '/convert/pdf-to-anki' },
    {
      label: 'Convert a CSV or Excel sheet to Anki',
      href: '/convert/csv-to-anki',
    },
    { label: 'Browse every converter', href: '/convert' },
  ],
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
  relatedLinks: [
    {
      label: 'Convert a CSV or Excel sheet to Anki',
      href: '/convert/csv-to-anki',
    },
    { label: 'Convert Anki notes to Notion', href: '/anki-to-notion' },
    { label: 'Convert an HTML file to Anki', href: '/convert/html-to-anki' },
    { label: 'Browse every converter', href: '/convert' },
  ],
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
  relatedLinks: [
    { label: 'Convert Notion pages to Anki', href: '/convert/notion-to-anki' },
    {
      label: 'Convert a CSV or Excel sheet to Anki',
      href: '/convert/csv-to-anki',
    },
    {
      label: 'Convert Markdown and Obsidian notes to Anki',
      href: '/convert/markdown-to-anki',
    },
    { label: 'Browse every converter', href: '/convert' },
  ],
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

const brainscapeToAnki: LandingCopy = {
  relatedLinks: [
    {
      label: 'Move StudyStack flashcards to Anki',
      href: '/convert/studystack-to-anki',
    },
    { label: 'Move Zorbi flashcards to Anki', href: '/convert/zorbi-to-anki' },
    { label: 'Convert Quizlet sets to Anki', href: '/quizlet-to-anki' },
    {
      label: 'Convert a CSV or Excel sheet to Anki',
      href: '/convert/csv-to-anki',
    },
    { label: 'Browse every converter', href: '/convert' },
  ],
  pathname: '/convert/brainscape-to-anki',
  title: 'Brainscape to Anki — move your flashcards to Anki | 2anki',
  description:
    'Move your Brainscape flashcards to Anki. Export your deck as a CSV, upload it here, and download a .apkg deck that opens clean.',
  h1: 'Move your Brainscape flashcards to Anki',
  subhead:
    'Export your Brainscape deck as CSV, drop it here, get a .apkg deck that opens clean in Anki.',
  whatComesAcross: ankiFidelityProof,
  faqs: [
    {
      q: 'How do I get a CSV out of Brainscape?',
      a: 'Open the deck you own, click the deck options menu, and pick Export. Brainscape has historically gated export behind a Pro plan — confirm in your account before you rely on it.',
    },
    {
      q: 'Does this work for decks I did not make?',
      a: 'No. Brainscape only lets you export decks you own. Copy the cards into a deck on your own account first, then export that one.',
    },
    {
      q: 'What gets carried across?',
      a: 'Whatever sits in the CSV columns. Brainscape exports the question and answer text by default — those become the card front and back. Extra columns map to extra fields if your CSV has them.',
    },
    {
      q: 'Do images come across?',
      a: "No. Brainscape's CSV export is text-only — images and audio stay in Brainscape. Re-add any visuals in Anki after import, or paste the image link if the CSV captured one.",
    },
  ],
};

const lingvistToAnki: LandingCopy = {
  relatedLinks: [
    { label: 'Move Pleco flashcards to Anki', href: '/convert/pleco-to-anki' },
    {
      label: 'Move Language Reactor saves to Anki',
      href: '/convert/language-reactor-to-anki',
    },
    { label: 'Move Zorbi flashcards to Anki', href: '/convert/zorbi-to-anki' },
    {
      label: 'Convert a CSV or Excel sheet to Anki',
      href: '/convert/csv-to-anki',
    },
    { label: 'Browse every converter', href: '/convert' },
  ],
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
      a: 'Lingvist offers an account-data download — search Lingvist\'s help center at help.lingvist.com for "data export" to find the current path. The download includes a CSV of your vocabulary that you can upload here.',
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
  relatedLinks: [
    {
      label: 'Move Brainscape flashcards to Anki',
      href: '/convert/brainscape-to-anki',
    },
    { label: 'Move Zorbi flashcards to Anki', href: '/convert/zorbi-to-anki' },
    { label: 'Convert Quizlet sets to Anki', href: '/quizlet-to-anki' },
    {
      label: 'Convert a CSV or Excel sheet to Anki',
      href: '/convert/csv-to-anki',
    },
    { label: 'Browse every converter', href: '/convert' },
  ],
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
      a: "Open your stack on studystack.com and look for the export or download option in the stack's menu. The exported file should contain your terms and definitions, ready to upload here.",
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
      a: 'Free 2anki accounts convert up to 100 cards per month — this is the 2anki limit, not a StudyStack restriction. Unlimited and Auto Sync plans remove the cap — see the pricing page.',
    },
  ],
};

const plecoToAnki: LandingCopy = {
  relatedLinks: [
    {
      label: 'Move Lingvist flashcards to Anki',
      href: '/convert/lingvist-to-anki',
    },
    {
      label: 'Move Language Reactor saves to Anki',
      href: '/convert/language-reactor-to-anki',
    },
    {
      label: 'Convert a CSV or Excel sheet to Anki',
      href: '/convert/csv-to-anki',
    },
    {
      label: 'Build Japanese Anki cards from Notion',
      href: '/anki-for-japanese',
    },
    { label: 'Browse every converter', href: '/convert' },
  ],
  pathname: '/convert/pleco-to-anki',
  title: 'Pleco to Anki — move your flashcards to Anki | 2anki',
  description:
    'Move your Pleco flashcards to Anki. Export your userdict as a .txt file, upload it here, and download a .apkg deck with your Chinese vocabulary.',
  h1: 'Move your Pleco flashcards to Anki',
  subhead:
    'Export your Pleco userdict as a .txt file, drop it here, and get a .apkg deck. Hanzi, pinyin, and definitions come across as basic cards.',
  whatComesAcross: ankiFidelityProof,
  faqs: [
    {
      q: 'Which Pleco export format works?',
      a: 'The tab-separated .txt userdict export works through our CSV pipeline. The XML userdict export does not — it carries Pleco-specific scheduling and category metadata we do not parse. Export as .txt and you are set.',
    },
    {
      q: 'How do I export the .txt file from Pleco?',
      a: 'In the Pleco app, open the flashcards module, go to Import/Export, choose Export Cards, and select the text file format. Save the file to your device, then upload it here.',
    },
    {
      q: 'Will hanzi, pinyin, and definitions all come across?',
      a: 'Yes. Each row in the .txt export becomes one card: hanzi on the front, pinyin and the English definition on the back. Tone marks and traditional or simplified characters are preserved.',
    },
    {
      q: 'Will my SRS progress and custom categories transfer?',
      a: 'Card content transfers — the words and definitions. Pleco review history, scheduling, and custom categories stay in Pleco; Anki schedules the imported cards from scratch with its own algorithm.',
    },
  ],
};

const zorbiToAnki: LandingCopy = {
  relatedLinks: [
    {
      label: 'Move Brainscape flashcards to Anki',
      href: '/convert/brainscape-to-anki',
    },
    {
      label: 'Move StudyStack flashcards to Anki',
      href: '/convert/studystack-to-anki',
    },
    { label: 'Convert Quizlet sets to Anki', href: '/quizlet-to-anki' },
    { label: 'Browse every converter', href: '/convert' },
  ],
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
      a: "Open your deck on zorbi.com and look for the export option in the deck menu. Download the CSV and upload it here. If you can't find the export option, check Zorbi's help docs for the current path.",
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

const languageReactorToAnki: LandingCopy = {
  relatedLinks: [
    {
      label: 'Move Lingvist flashcards to Anki',
      href: '/convert/lingvist-to-anki',
    },
    { label: 'Move Pleco flashcards to Anki', href: '/convert/pleco-to-anki' },
    { label: 'Convert EPUB highlights to Anki', href: '/convert/epub-to-anki' },
    {
      label: 'Anki for Japanese — JLPT, kanji, vocab',
      href: '/anki-for-japanese',
    },
    { label: 'Browse every converter', href: '/convert' },
  ],
  pathname: '/convert/language-reactor-to-anki',
  title: 'Language Reactor to Anki — move your saved phrases to Anki | 2anki',
  description:
    'Move your Language Reactor saves to Anki. Export the zip from Language Reactor, upload it here, and download a .apkg deck with your phrases, images, and audio.',
  h1: 'Move your Language Reactor saves to Anki',
  subhead:
    'Drop the export zip from Language Reactor — your saved phrases, images, and audio come across as a clean .apkg you can study on any device.',
  whatComesAcross: ankiFidelityProof,
  faqs: [
    {
      q: 'How do I export from Language Reactor?',
      a: 'Open the Language Reactor extension, go to your saved phrases, and use the Export option to download a ZIP. The ZIP contains a CSV of your phrases together with the images and audio captured from the source video and subtitles.',
    },
    {
      q: "What's in the export?",
      a: 'Your saved phrases become cards — the phrase on the front, the translation and context on the back. Images and audio captured from the source video come across embedded so each card keeps its sentence audio and screenshot.',
    },
    {
      q: 'Why do the thumbnails look blank in Anki on my phone?',
      a: 'Language Reactor stores card thumbnails using CSS background-image URLs. Anki desktop renders these; Anki mobile on iOS and Android does not. The phrase, translation, and audio still work — only the thumbnail image is missing on mobile. Workaround: study these cards on desktop, or wait for the automatic rewrite that turns background-image into a regular img tag (planned).',
    },
    {
      q: 'Does the sentence audio stay paired with the right card?',
      a: 'Yes. Each audio clip is named in the export so it stays attached to the phrase it came from. After import, tapping the play button on a card plays the original line from the source video.',
    },
  ],
};

const epubToAnki: LandingCopy = {
  relatedLinks: [
    {
      label: 'Convert Kindle highlights to Anki',
      href: '/convert/kindle-to-anki',
    },
    {
      label: 'Move Language Reactor saves to Anki',
      href: '/convert/language-reactor-to-anki',
    },
    { label: 'Convert a PDF to Anki', href: '/convert/pdf-to-anki' },
    { label: 'Browse every converter', href: '/convert' },
  ],
  pathname: '/convert/epub-to-anki',
  title: 'EPUB highlights to Anki — turn ebook highlights into cards | 2anki',
  description:
    'Turn the passages you highlighted in a DRM-free EPUB into an Anki deck. Upload the file and get a .apkg — each highlight on a card, with the book and author on the back.',
  h1: 'EPUB highlights to Anki — from ebook highlights to cards',
  subhead:
    'Drop a DRM-free .epub and download a .apkg. Each passage you highlighted becomes a card, with the book title and author on the back.',
  faqs: [
    {
      q: 'Which EPUB files work?',
      a: 'DRM-free EPUBs — the kind from Project Gutenberg, Standard Ebooks, or a publisher who sells unlocked files. DRM-locked files can’t be opened; use a DRM-free copy instead.',
    },
    {
      q: 'How does an ebook become flashcards?',
      a: 'Each passage you highlighted in the ebook becomes one card — the highlight on the front, the book title and author on the back so you remember where it came from.',
    },
    {
      q: 'Where does the deck name come from?',
      a: 'From the book’s title if the EPUB carries one, otherwise the filename. Rename the file before uploading if you want a cleaner fallback name in Anki.',
    },
    {
      q: 'Can I keep using EPUB and Kindle highlights together?',
      a: 'Yes. Convert an EPUB for the passages you highlighted in a DRM-free book, and upload a Kindle My Clippings.txt for the highlights you marked on a Kindle. Both produce a deck you study in Anki.',
    },
  ],
};

const kindleToAnki: LandingCopy = {
  relatedLinks: [
    { label: 'Convert EPUB highlights to Anki', href: '/convert/epub-to-anki' },
    { label: 'Convert a PDF to Anki', href: '/convert/pdf-to-anki' },
    {
      label: 'Convert Markdown and Obsidian notes to Anki',
      href: '/convert/markdown-to-anki',
    },
    { label: 'Browse every converter', href: '/convert' },
  ],
  pathname: '/convert/kindle-to-anki',
  title: 'Kindle highlights to Anki — My Clippings.txt to a deck | 2anki',
  description:
    'Turn your Kindle My Clippings.txt into an Anki deck. Copy the file off your Kindle, upload it, and get a .apkg — each highlight and note on a card, with the book and author on the back.',
  h1: 'Kindle highlights to Anki — from My Clippings.txt to a deck',
  subhead:
    'Copy My Clippings.txt off your Kindle, drop it here, and download a .apkg. Each passage you highlighted — and any note you typed — becomes a card.',
  faqs: [
    {
      q: 'Where do I find My Clippings.txt?',
      a: 'Connect your Kindle to your computer by USB. Open the device in your file browser, go to the documents folder, and copy My Clippings.txt. That single file holds every highlight, note, and bookmark across all your books.',
    },
    {
      q: 'What becomes a card?',
      a: 'Every highlight and note becomes one card — the passage on the front, the book title and author on the back. Bookmarks are skipped. You review exactly what you marked while reading.',
    },
    {
      q: 'Which Kindle languages are recognized?',
      a: 'Kindles set to English, German, Spanish, or French. 2anki reads the highlight and note markers in those four languages; a Kindle set to another language may not be picked up.',
    },
    {
      q: 'Can I upload highlights from several books at once?',
      a: 'Yes. My Clippings.txt spans every book on the device, so one upload turns all your recent highlights into a single deck. Split it into subdecks inside Anki after import if you want one deck per book.',
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
  ['brainscape-to-anki', brainscapeToAnki],
  ['lingvist-to-anki', lingvistToAnki],
  ['studystack-to-anki', studystackToAnki],
  ['pleco-to-anki', plecoToAnki],
  ['zorbi-to-anki', zorbiToAnki],
  ['language-reactor-to-anki', languageReactorToAnki],
  ['epub-to-anki', epubToAnki],
  ['kindle-to-anki', kindleToAnki],
]);
