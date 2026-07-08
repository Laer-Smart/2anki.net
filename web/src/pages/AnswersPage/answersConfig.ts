export type AnswerFigureKind = 'forgetting-curve' | 'retention-workload';

export interface AnswerFigure {
  kind: AnswerFigureKind;
  caption: string;
}

export interface AnswerSection {
  heading: string;
  body: string;
  figure?: AnswerFigure;
}

export interface AnswerFaq {
  q: string;
  a: string;
}

export interface AnswerConfig {
  slug: string;
  title: string;
  description: string;
  h1: string;
  intro: string;
  sections: AnswerSection[];
  relatedLinks: ReadonlyArray<{ label: string; href: string }>;
  faqs?: AnswerFaq[];
}

const convertNotionToAnki: AnswerConfig = {
  slug: 'convert-notion-to-anki',
  title: 'How to convert Notion to Anki flashcards | 2anki',
  description:
    'Step-by-step guide to converting Notion pages into Anki flashcard decks. Connect Notion once, paste a page link, download a .apkg file.',
  h1: 'How to convert Notion to Anki flashcards',
  intro:
    'Notion stores your notes. Anki turns them into a review system. 2anki bridges the gap — you get a .apkg deck from any Notion page in under a minute.',
  sections: [
    {
      heading: 'Format your Notion page for cards',
      body: 'Toggle blocks are the primary card source. The toggle heading becomes the front of the card; the content inside becomes the back. Nest one level of toggles inside another to create subdecks. Strikethrough text anywhere on the page becomes a tag applied to every card in that deck.',
    },
    {
      heading: 'Connect Notion and convert',
      body: 'Sign in to 2anki, go to the upload page, and click "Connect Notion". Authorise read access once — 2anki only reads pages you select. Paste a Notion page URL, click Convert, and download the .apkg file. Open it in Anki with a double-click.',
    },
    {
      heading: 'What comes across',
      body: 'Images embed directly in cards. Code blocks keep their formatting. Audio files attach to the card. Equations stored as images appear as images; equations stored as LaTeX text render if MathJax is enabled in your Anki card template. Anything that cannot be fetched is replaced with a short note so the card still works.',
    },
    {
      heading: 'Re-convert after editing',
      body: 'Paste the same page URL again to get a fresh deck reflecting your edits. For edits to sync automatically every 5 minutes without manual steps, use Auto Sync ($30/month).',
    },
    {
      heading: 'Use a Notion export instead',
      body: 'Export your Notion page as HTML (from the Notion desktop app: Export → HTML) and upload the .zip file to 2anki. This path works without an OAuth connection and supports the full export including images.',
    },
  ],
  relatedLinks: [
    {
      label: 'Auto Sync — automatic Notion to Anki sync',
      href: '/answers/notion-to-anki-sync?ref=ai',
    },
    { label: 'Pricing', href: '/pricing?ref=ai' },
    {
      label: '/convert/notion-to-anki',
      href: '/convert/notion-to-anki?ref=ai',
    },
  ],
};

const notionToAnkiSync: AnswerConfig = {
  slug: 'notion-to-anki-sync',
  title: 'Notion to Anki automatic sync — how Auto Sync works | 2anki',
  description:
    'Auto Sync keeps your Anki decks up to date as you edit Notion. Connect once, edit in Notion, study in Anki — no manual exports.',
  h1: 'Notion to Anki automatic sync',
  intro:
    'Auto Sync watches your connected Notion pages and pushes changes to your Anki decks every 5 minutes. Edit a toggle in Notion; the card updates in Anki before your next review session.',
  sections: [
    {
      heading: 'How it works',
      body: '2anki polls the pages you have connected every 5 minutes. When it detects changes, it rebuilds the affected deck and queues it for the next sync. Anki picks up the updated .apkg the next time it syncs with AnkiWeb.',
    },
    {
      heading: 'Set up Auto Sync',
      body: 'Subscribe to Auto Sync ($30/month) at 2anki.net/pricing. Then go to 2anki.net/ankify/setup, connect your Notion workspace, and select the pages to watch. The first sync runs within 5 minutes.',
    },
    {
      heading: 'Card format requirements',
      body: 'Auto Sync reads the same toggle structure as one-off conversions. Toggle heading → card front. Toggle body → card back. Strikethrough text → tag. Keep your Notion pages in this shape and every edit flows through automatically.',
    },
    {
      heading: 'Difference from one-off conversion',
      body: 'One-off conversion: paste a URL, download a .apkg, import manually. Auto Sync: connect once, edits propagate automatically. Auto Sync is the right choice if you update your Notion notes regularly and want your Anki deck to stay current without manual steps.',
    },
  ],
  relatedLinks: [
    {
      label: 'How to convert Notion to Anki',
      href: '/answers/convert-notion-to-anki?ref=ai',
    },
    { label: 'Auto Sync pricing', href: '/pricing?ref=ai' },
    { label: 'Auto Sync setup', href: '/ankify/setup?ref=ai' },
  ],
};

const pdfToAnki: AnswerConfig = {
  slug: 'pdf-to-anki',
  title: 'How to convert a PDF to Anki flashcards | 2anki',
  description:
    'Upload a PDF and get an Anki deck. Headings name the deck and subdecks, bullets become card fronts, and the next line becomes the answer.',
  h1: 'How to convert a PDF to Anki flashcards',
  intro:
    'Upload a PDF to 2anki and download a .apkg deck. Works with lecture slides, textbook chapters, and any PDF with a text layer.',
  sections: [
    {
      heading: 'What the converter needs',
      body: 'The PDF must have a text layer — most modern textbook exports, slide PDFs exported from PowerPoint or Keynote, and lecture notes do. Scanned images with no text layer will not produce cards. Run a scanned PDF through OCR in macOS Preview or Adobe Acrobat first.',
    },
    {
      heading: 'How cards are built',
      body: 'Headings in the PDF name the deck and subdecks. Top-level bullets become card fronts; the next indent level or line becomes the back. Diagrams come across as embedded images. Equations stored as images appear as images; LaTeX equations render if MathJax is enabled in your Anki card template.',
    },
    {
      heading: 'Convert a PDF',
      body: 'Go to 2anki.net, drag your PDF onto the upload area, and click Convert. Download the .apkg file and open it in Anki with a double-click. No account required for PDFs under the free plan limit.',
    },
    {
      heading: 'Large PDFs and textbooks',
      body: 'Large PDFs work — a whole textbook uploads fine. Big files take longer and create large decks. Uploading one chapter at a time keeps decks easier to review and share. The free plan covers 100 cards per month; the Unlimited plan has no card limit.',
    },
  ],
  relatedLinks: [
    { label: 'PDF to Anki converter', href: '/convert/pdf-to-anki?ref=ai' },
    { label: 'Pricing — Unlimited plan', href: '/pricing?ref=ai' },
    {
      label: 'How to convert Notion to Anki',
      href: '/answers/convert-notion-to-anki?ref=ai',
    },
  ],
};

const quizletToAnki: AnswerConfig = {
  slug: 'quizlet-to-anki',
  title: 'How to move from Quizlet to Anki | 2anki',
  description:
    'Export your Quizlet sets and import them into Anki via 2anki. Keep your existing cards and study them with spaced repetition in Anki.',
  h1: 'How to move from Quizlet to Anki',
  intro:
    'Quizlet stores your sets. Anki gives you a proper spaced repetition algorithm. 2anki converts a Quizlet export into a .apkg deck you can open in Anki directly.',
  sections: [
    {
      heading: 'Export your Quizlet set',
      body: 'Open the set in Quizlet. Click the three-dot menu and choose Export. Select the tab-separated format (TSV). Save the file — it downloads as a .txt file.',
    },
    {
      heading: 'Convert and import',
      body: 'Go to 2anki.net, drag the exported .txt file onto the upload area, and click Convert. Download the .apkg file and open it in Anki with a double-click. Your cards appear as a new deck.',
    },
    {
      heading: 'What carries over',
      body: 'Terms and definitions carry over as card fronts and backs. Images embedded in a Quizlet set do not export in the standard TSV format — only text transfers. For image-heavy sets, copy the images manually into the Anki card editor after import.',
    },
    {
      heading: 'Why Anki over Quizlet',
      body: 'Anki uses the SM-2 spaced repetition algorithm, which schedules cards based on how well you remember them. This means you review difficult cards more often and easy cards less often — more efficient than fixed review cycles. Anki works offline, syncs across devices via AnkiWeb, and the core app is free.',
    },
  ],
  relatedLinks: [
    { label: 'Quizlet to Anki converter', href: '/quizlet-to-anki?ref=ai' },
    {
      label: 'How to convert Notion to Anki',
      href: '/answers/convert-notion-to-anki?ref=ai',
    },
    { label: 'Pricing', href: '/pricing?ref=ai' },
  ],
};

const fsrsExplained: AnswerConfig = {
  slug: 'fsrs-explained',
  title: 'FSRS in Anki — why your next review is 17 months | 2anki',
  description:
    'FSRS is the modern spaced repetition algorithm available in Anki since 23.10. If a card you just answered is scheduled 17 months out, that is FSRS — not a bug. Here is what it is, why the interval looks wrong, and what to do about it.',
  h1: 'FSRS in Anki — what it is and why your next review looks wrong',
  intro:
    'FSRS is the modern spaced repetition algorithm Anki has shipped since version 23.10 (November 2023). It is still opt-in — SM-2 remains the default — but it is widely recommended in the community and the Anki manual presents it as more accurate than SM-2. FSRS predicts how long you will remember a card and schedules the next review at the point your recall probability drops to 90%. For a card you answer easily, that point can be a year or more away — which is the source of the "why is my next review in 17 months" question that fills r/Anki every week.',
  sections: [
    {
      heading: 'What FSRS does',
      body: 'FSRS — Free Spaced Repetition Scheduler — is an alternative to SM-2, the SuperMemo 2 algorithm Anki has used since 2006 (nearly two decades). FSRS models your forgetting curve from your actual review history and picks the next interval to land at your desired retention. By default that target is 90% — every interval is chosen so that, when the card comes back, you have a 90% chance of remembering it. Hit Good on a card you know well and FSRS calculates: "to drop from near-certain to 90% recall, we can wait a long time."',
      figure: {
        kind: 'forgetting-curve',
        caption:
          'Recall probability decays over time. FSRS schedules the next review at the point you cross 90% — the default desired retention.',
      },
    },
    {
      heading: 'Why your next review is 17 months out',
      body: 'Two reasons. First, if you have not yet run the FSRS optimizer, you are using the generic default weights — these are tuned to a population average across hundreds of millions of reviews, so they are accurate for an average user but may not match how fast or slowly you personally forget. Second, the algorithm responds aggressively to Easy on early reviews; rating an early card Easy can make the next interval grow dramatically. The 17-month number is not a bug — it is FSRS doing exactly what the math says, with not enough data about you to be conservative.',
    },
    {
      heading: 'What to do about it',
      body: 'The simplest fix: lower the desired retention. Open the deck options (click the gear icon on the Decks screen and choose Options, or press O while reviewing), scroll to FSRS, and drop Desired retention from 0.90 to 0.85. Intervals shorten across the board, in exchange for slightly more reviews per day. The other thing worth getting right is grading: on early reviews, Good is the right answer unless you genuinely already knew the material. The Anki manual is most emphatic about one specific bad habit — pressing Hard instead of Again when you actually forgot. Hard tells FSRS you remembered with effort; Again tells it you forgot. The two send opposite signals, and Hard-instead-of-Again is the one mistake the algorithm cannot recover from cleanly.',
      figure: {
        kind: 'retention-workload',
        caption:
          'Reviews per day grow steeply as desired retention approaches 1.0. Dropping from 0.90 to 0.85 lightens the load; pushing to 0.95 roughly doubles it.',
      },
    },
    {
      heading: 'When to optimize FSRS weights',
      body: 'Once you have some review history — a few hundred reviews on a deck is enough today — open the deck options the same way (gear icon → Options) and click Optimize under FSRS parameters. This replaces the generic weights with weights derived from your own forgetting pattern. The Anki manual recommends running the optimizer about once a month; more often than that is overkill, and over time, with enough review history, the parameters stabilise and re-optimizing stops moving them much.',
    },
    {
      heading: 'Should you go back to SM-2',
      body: 'Probably not. SM-2 adjusts intervals through an ease factor that moves with how you grade each card, but it does not model your forgetting curve mathematically — so it cannot target a specific retention rate the way FSRS does. FSRS, even with the generic weights, schedules more accurately because it is actually predicting recall probability instead of applying heuristic multipliers. The 17-month interval that looks wrong on day one is in fact closer to your true forgetting curve than the SM-2 interval would have been. Lower the desired retention rather than switch algorithms.',
    },
    {
      heading: 'Where 2anki fits in',
      body: '2anki converts your notes into Anki decks — Notion, PDF, EPUB, Kindle highlights, Markdown, HTML, CSV, and Quizlet exports. The cards 2anki produces work with whichever scheduling algorithm you have enabled in Anki; FSRS and SM-2 both use the same card data. Tuning your scheduling is something you do once in Anki itself, not per-deck.',
    },
  ],
  relatedLinks: [
    {
      label: 'Convert Notion to Anki',
      href: '/answers/convert-notion-to-anki?ref=ai',
    },
    { label: 'Convert a PDF to Anki', href: '/answers/pdf-to-anki?ref=ai' },
    { label: 'Pricing', href: '/pricing?ref=ai' },
  ],
};

const lectureNotesToAnki: AnswerConfig = {
  slug: 'lecture-notes-to-anki',
  title: 'How to turn lecture notes into Anki flashcards | 2anki',
  description:
    "Turn lecture notes into Anki cards, whatever form they're in — PDF slides, Word, Notion, Markdown, or a photo. Pick your source, upload, download a .apkg deck.",
  h1: 'How to turn lecture notes into Anki flashcards',
  intro:
    'Your lecture notes are already somewhere — slide PDFs, a Word or Google doc, a Notion page, or a photo you took in class. 2anki reads each of those and gives you a .apkg deck you open in Anki. Pick the source that matches your notes and start reviewing the same day.',
  sections: [
    {
      heading: 'Start from lecture slides (PDF or PowerPoint)',
      body: 'Most lecture handouts are PDF or PowerPoint exports. Upload the file and 2anki reads its text into question-and-answer cards, with headings naming the deck and subdecks. Slides that are mostly images fall back to image cards so you still get a reviewable deck.',
    },
    {
      heading:
        'Start from typed notes (Word, Google Docs, Notion, or Markdown)',
      body: 'If you type your notes, 2anki reads the structure directly. Word (.docx) and Google Docs exports keep headings, images, and formatting. Notion toggles become cards — heading on the front, body on the back. Markdown from Obsidian or a plain editor works the same way. Strikethrough text anywhere becomes a tag on every card in that deck.',
    },
    {
      heading: 'Start from a photo of handwritten notes',
      body: 'Took the photo in class? Upload it and 2anki turns the page into cards you can edit. Diagrams you want to quiz yourself on — anatomy, circuits, maps — go through image occlusion, where you mask the parts to recall.',
    },
    {
      heading: 'Format your notes so they make good cards',
      body: 'One idea per card beats a wall of text. Use headings to name decks, keep questions short, and let 2anki pair each prompt with its answer. You can edit every card in Anki afterward — nothing is locked down.',
    },
    {
      heading: 'Free for your first 100 cards a month',
      body: 'The free plan converts 100 cards a month, enough to build a deck for one course before you decide. Unlimited removes the cap for a full semester load. If you keep editing your notes in Notion, Auto Sync rebuilds the deck automatically.',
    },
  ],
  faqs: [
    {
      q: "What's the fastest way to turn lecture notes into Anki cards?",
      a: "Upload the file you already have. A slide PDF, a Word or Google doc, a Notion page, or a photo all convert to a .apkg deck in about a minute. You don't retype anything.",
    },
    {
      q: 'My notes are in several formats. Do I need separate decks?',
      a: 'No. Convert each source and Anki merges them, or point each conversion at the same deck name. Headings inside each file become subdecks so one course stays organized.',
    },
    {
      q: 'Will my diagrams and images come across?',
      a: 'Yes. Images embed directly in the card. For diagrams you want to actively recall, use image occlusion to mask and quiz the labeled parts.',
    },
    {
      q: 'Is there a card limit?',
      a: "The free plan converts 100 cards a month. Unlimited removes the cap, which matters once you're building decks for a full course load.",
    },
  ],
  relatedLinks: [
    { label: 'Convert a PDF to Anki', href: '/answers/pdf-to-anki?ref=ai' },
    {
      label: 'Convert a Word document to Anki',
      href: '/answers/word-to-anki?ref=ai',
    },
    {
      label: 'Make image occlusion cards',
      href: '/answers/image-occlusion-anki?ref=ai',
    },
    {
      label: 'Convert Notion to Anki',
      href: '/answers/convert-notion-to-anki?ref=ai',
    },
    { label: 'Pricing', href: '/pricing?ref=ai' },
  ],
};

const wordToAnki: AnswerConfig = {
  slug: 'word-to-anki',
  title: 'How to convert a Word document to Anki | 2anki',
  description:
    'Upload a Word (.docx) file and get an Anki deck. Headings name the deck, images embed, strikethrough becomes tags. No retyping, no add-on — download a .apkg.',
  h1: 'How to convert a Word document to Anki',
  intro:
    "If your notes live in a Word document, you don't need to rebuild them as cards by hand. Upload the .docx file to 2anki and download a .apkg deck that opens in Anki. Headings, images, and formatting come across.",
  sections: [
    {
      heading: 'What carries over from a .docx file',
      body: "2anki reads the document's structure. Headings name the deck and subdecks. Images embed directly in the cards. Bold, italics, and lists keep their formatting. Strikethrough text becomes a tag applied to every card in that deck — a quick way to label a chapter or topic.",
    },
    {
      heading: 'Format your document for clean cards',
      body: 'Use headings for deck and section names. Put one question or term per line with its answer on the next. Short prompts make better cards than paragraphs. You can edit every card in Anki after import, so a rough first pass is fine.',
    },
    {
      heading: 'Convert your document',
      body: 'Go to 2anki.net, drag your .docx file onto the upload area, and click Convert. Download the .apkg file and open it in Anki with a double-click. Your cards appear as a new deck. The free plan covers your first 100 cards a month.',
    },
    {
      heading: 'Coming from Google Docs',
      body: 'Google Docs exports to Word format: File → Download → Microsoft Word (.docx). Upload that file the same way. Everything in this guide applies.',
    },
    {
      heading: 'Tables and two-column notes',
      body: 'A two-column table — term on the left, definition on the right — converts cleanly, with each row becoming a card. Keep your term-and-definition notes in a table and the whole document turns into a deck in one pass.',
    },
  ],
  faqs: [
    {
      q: 'Does 2anki keep images from my Word document?',
      a: "Yes. Images in the .docx file embed directly in the cards — you don't attach them separately.",
    },
    {
      q: 'How does 2anki decide what becomes a card?',
      a: 'Headings name the deck and subdecks. Term-and-answer lines and two-column tables become card fronts and backs. Strikethrough text becomes a tag.',
    },
    {
      q: 'Can I convert a Google Doc?',
      a: 'Download it as Word format first (File → Download → Microsoft Word), then upload the .docx file. It converts the same way.',
    },
    {
      q: 'Do I need to install anything in Anki?',
      a: 'No. 2anki produces a standard .apkg file. Double-click it in Anki and the deck imports — no add-on required.',
    },
  ],
  relatedLinks: [
    {
      label: 'Turn lecture notes into Anki flashcards',
      href: '/answers/lecture-notes-to-anki?ref=ai',
    },
    { label: 'Convert a PDF to Anki', href: '/answers/pdf-to-anki?ref=ai' },
    { label: 'Pricing', href: '/pricing?ref=ai' },
  ],
};

const imageOcclusionAnki: AnswerConfig = {
  slug: 'image-occlusion-anki',
  title: 'How to make image occlusion cards in Anki | 2anki',
  description:
    'Make image occlusion cards from any diagram. Upload an image, mask the labels you want to recall, and download an Anki deck. Rectangle, ellipse, and polygon tools.',
  h1: 'How to make image occlusion cards in Anki',
  intro:
    "Image occlusion cards hide part of a diagram and ask you to recall what's underneath — the fastest way to memorize anatomy, structures, maps, and labeled figures. Upload an image to 2anki, mask the parts you want to test, and download an Anki deck.",
  sections: [
    {
      heading: 'What image occlusion is good for',
      body: 'Any labeled diagram where the labels are the point: anatomy plates, histology slides, biochemistry pathways, circuit diagrams, geography maps. You mask each label and Anki asks you to recall it, one region at a time, instead of staring at the whole figure.',
    },
    {
      heading: 'Upload your image',
      body: 'Open the image occlusion editor, drag in a diagram, or pull an image straight from a Notion page. Screenshots, textbook figures, and photos of a printed diagram all work.',
    },
    {
      heading: 'Mask the parts you want to recall',
      body: 'Draw over each label with the rectangle, ellipse, or polygon tool — polygon handles irregular shapes like an organ outline. Hide and show the masks as you work to check your coverage, and undo or duplicate a mask to move fast across a busy figure.',
    },
    {
      heading: 'Download and study in Anki',
      body: '2anki turns each masked region into its own card and packages the deck as a .apkg file. Open it in Anki with a double-click. Every masked region becomes a separate prompt, so one diagram can produce a dozen cards in a couple of minutes.',
    },
    {
      heading: 'Occlusion for a whole course',
      body: 'Diagram-heavy subjects are faster to review as occlusion cards than as text. Build them alongside your text cards from lecture slides and notes so one deck covers both the facts and the figures.',
    },
  ],
  faqs: [
    {
      q: 'What image formats can I use?',
      a: 'Standard image files — screenshots, textbook figures, or photos of a printed diagram. You can also import an image directly from a Notion page.',
    },
    {
      q: 'Does each mask become its own card?',
      a: 'Yes. Every region you mask becomes a separate card, so a single labeled diagram can produce many cards in one pass.',
    },
    {
      q: 'Do I need the Anki image occlusion add-on?',
      a: 'No. 2anki produces a standard .apkg deck that opens in Anki with a double-click — no add-on to install or configure.',
    },
    {
      q: 'Can I mask irregular shapes?',
      a: 'Yes. The polygon tool traces irregular outlines like an organ or a region on a map, alongside the rectangle and ellipse tools for simpler shapes.',
    },
  ],
  relatedLinks: [
    {
      label: 'Turn lecture notes into Anki flashcards',
      href: '/answers/lecture-notes-to-anki?ref=ai',
    },
    { label: 'Image occlusion editor', href: '/image-occlusion?ref=ai' },
    { label: 'Pricing', href: '/pricing?ref=ai' },
  ],
};

const googleDocsToAnki: AnswerConfig = {
  slug: 'google-docs-to-anki',
  title: 'How to convert Google Docs to Anki flashcards | 2anki',
  description:
    'Turn Google Docs notes into an Anki deck. Download your doc as Word (.docx) or Markdown, upload it to 2anki, and get a .apkg deck. Headings name decks, images embed.',
  h1: 'How to convert Google Docs to Anki flashcards',
  intro:
    "Google Docs doesn't connect to 2anki directly, but you don't have to retype anything. Download your doc as Word (.docx) or Markdown, upload the file, and download a .apkg deck that opens in Anki. Headings, images, and formatting come across.",
  sections: [
    {
      heading: 'Download your Google Doc',
      body: 'In Google Docs, open File → Download and pick Microsoft Word (.docx) or Markdown (.md). Word keeps images and tables, so it is the better choice for a doc with diagrams or two-column notes. Markdown is lighter and works well for plain text-and-heading notes.',
    },
    {
      heading: 'What carries over',
      body: '2anki reads the document structure. Headings name the deck and subdecks. Images in a .docx file embed directly in the cards. Bold, italics, and lists keep their formatting. Strikethrough text becomes a tag applied to every card in that deck — a quick way to label a chapter or topic.',
    },
    {
      heading: 'Format your doc for clean cards',
      body: 'Use headings for deck and section names. Put one question or term per line with its answer on the next. A two-column table — term on the left, definition on the right — converts cleanly, one card per row. Short prompts make better cards than paragraphs, and you can edit every card in Anki afterward.',
    },
    {
      heading: 'Convert your file',
      body: 'Go to 2anki.net, drag your .docx or .md file onto the upload area, and click Convert. Download the .apkg file and open it in Anki with a double-click. Your cards appear as a new deck. The free plan covers your first 100 cards a month.',
    },
    {
      heading: 'Markdown or Word — which export',
      body: 'Both upload the same way. Choose Word if your doc has images, tables, or heavy formatting you want preserved. Choose Markdown if your notes are plain headings and text and you want the smallest, cleanest file. When in doubt, Word carries the most across.',
    },
  ],
  faqs: [
    {
      q: 'Can I connect Google Docs to 2anki directly?',
      a: 'No. Download the doc as Word (.docx) or Markdown first — File → Download in Google Docs — then upload the file. It converts the same way as any Word or Markdown upload.',
    },
    {
      q: 'Do images from my Google Doc come across?',
      a: 'Yes, when you export as Word (.docx). Images embed directly in the cards. For an image-heavy doc, use the Word export rather than Markdown.',
    },
    {
      q: 'Will a two-column table become cards?',
      a: 'Yes. A term-and-definition table converts one card per row. Export as Word to keep the table structure intact.',
    },
    {
      q: 'Do I need to install anything in Anki?',
      a: 'No. 2anki produces a standard .apkg file. Double-click it in Anki and the deck imports — no add-on required.',
    },
  ],
  relatedLinks: [
    {
      label: 'Convert a Word document to Anki',
      href: '/answers/word-to-anki?ref=ai',
    },
    {
      label: 'Markdown to Anki converter',
      href: '/convert/markdown-to-anki?ref=ai',
    },
    {
      label: 'Turn lecture notes into Anki flashcards',
      href: '/answers/lecture-notes-to-anki?ref=ai',
    },
    { label: 'Pricing', href: '/pricing?ref=ai' },
  ],
};

const handwrittenNotesToAnki: AnswerConfig = {
  slug: 'handwritten-notes-to-anki',
  title: 'How to turn handwritten notes into Anki flashcards | 2anki',
  description:
    'Photograph your handwritten notes and turn them into Anki cards. 2anki reads the page with AI, drafts question-and-answer cards you review, and packages a .apkg deck.',
  h1: 'How to turn handwritten notes into Anki flashcards',
  intro:
    'Handwritten notes are hard to review and impossible to search. Photograph a page, upload it to 2anki, and the photo-to-deck tool reads it with AI and drafts cards you review before download. You get a .apkg deck that opens in Anki.',
  sections: [
    {
      heading: 'Take a clear photo',
      body: 'Lay the page flat, light it evenly, and fill the frame with one page per photo. Legible handwriting reads best. Photos up to 10 MB work, in the usual formats — JPEG, PNG, WebP, GIF, or HEIC straight from an iPhone.',
    },
    {
      heading: 'How photo-to-deck works',
      body: 'Upload the photo on the photo-to-deck page. In generative mode, 2anki reads the page and drafts question-and-answer cards from what it finds. In verbatim mode, it keeps your text as written instead of rephrasing it. You pick roughly how many cards to aim for before converting.',
    },
    {
      heading: 'Review every card before you study',
      body: "AI drafts are a starting point, not the final deck. Every card is editable — fix a misread word, tighten a question, or drop a card you don't need. Reviewing the draft once is faster than typing the deck from scratch.",
    },
    {
      heading: 'Diagrams and labeled figures',
      body: 'For a hand-drawn diagram where the labels are the point — an anatomy sketch, a circuit, a labeled map — use image occlusion instead. You mask each label and Anki asks you to recall it one region at a time.',
    },
    {
      heading: 'What it costs',
      body: 'The free plan covers your first 100 cards a month, enough to turn a stack of notes into a starter deck. Unlimited removes the cap and adds the multiple-choice option for photo-to-deck cards.',
    },
  ],
  faqs: [
    {
      q: 'Does 2anki read my handwriting?',
      a: 'Yes. Photo-to-deck uses AI to read the page and draft cards. Clear, legible handwriting on a well-lit, flat page reads best.',
    },
    {
      q: 'Can I fix mistakes in the cards?',
      a: 'Yes. Every card is a draft you review before download, and all of them stay editable in Anki afterward. Correct any misread word and move on.',
    },
    {
      q: 'What photo formats and sizes work?',
      a: 'JPEG, PNG, WebP, GIF, and HEIC, up to 10 MB per photo. One page per photo gives the cleanest result.',
    },
    {
      q: 'What about diagrams I want to memorize?',
      a: 'Use image occlusion for labeled diagrams. You mask each label and recall it one at a time — better than a single front-and-back card for a busy figure.',
    },
  ],
  relatedLinks: [
    { label: 'Photo to flashcards', href: '/photo-to-deck?ref=ai' },
    {
      label: 'Make image occlusion cards',
      href: '/answers/image-occlusion-anki?ref=ai',
    },
    {
      label: 'Turn lecture notes into Anki flashcards',
      href: '/answers/lecture-notes-to-anki?ref=ai',
    },
    { label: 'Pricing', href: '/pricing?ref=ai' },
  ],
};

const textbookToAnki: AnswerConfig = {
  slug: 'textbook-to-anki',
  title: 'How to turn a textbook chapter into Anki flashcards | 2anki',
  description:
    'Turn textbook chapters into Anki decks. Upload a PDF and 2anki reads the text into cards, keeps figures, and can include the page image. Convert one chapter at a time.',
  h1: 'How to turn a textbook chapter into Anki flashcards',
  intro:
    'A textbook chapter is a lot of material to card by hand. Upload the chapter as a PDF and 2anki reads its text into question-and-answer cards, keeps the figures, and gives you a .apkg deck. Convert one chapter at a time so each deck stays reviewable.',
  sections: [
    {
      heading: 'Get the chapter as a PDF with a text layer',
      body: 'The PDF needs a real text layer — most publisher e-textbooks and exported chapters have one. A scanned photocopy with no text layer will not produce text cards; run it through OCR in macOS Preview or Adobe Acrobat first, or use the page-image option below.',
    },
    {
      heading: 'How cards are built',
      body: 'Headings in the chapter name the deck and subdecks. Top-level bullets and term-and-answer lines become card fronts, with the next line or indent level as the back. Figures and diagrams come across as embedded images so a labeled plate still reads on the card.',
    },
    {
      heading: 'Include the page image',
      body: 'You can opt in to attach the source page image to its cards. That keeps the original layout and any figure the text layer misses within reach while you review — useful for dense, diagram-heavy chapters where the words alone lose context.',
    },
    {
      heading: 'AI cards for prose-heavy chapters',
      body: 'Some chapters are paragraphs, not bullet lists. On the Unlimited plan, AI can draft question-and-answer cards from that prose so you are not hand-writing every card. Review the drafts and edit any that need tightening before you study.',
    },
    {
      heading: 'Convert one chapter at a time',
      body: 'A whole textbook uploads fine, but big files make big decks that are slow to review and share. One chapter per conversion keeps each deck focused and easy to organize. The free plan covers 100 cards a month; Unlimited removes the cap for a full semester of chapters.',
    },
  ],
  faqs: [
    {
      q: 'Can I upload a whole textbook at once?',
      a: 'You can, but one chapter at a time is better. Large PDFs make large decks that are slow to review and share. Chapter-by-chapter keeps each deck focused.',
    },
    {
      q: 'My textbook is a scan with no text layer. Will it work?',
      a: 'Not for text cards — 2anki needs a real text layer. Run the scan through OCR first (macOS Preview or Adobe Acrobat), or use the page-image option to attach the page to each card.',
    },
    {
      q: 'Do figures and diagrams come across?',
      a: 'Yes. Figures embed as images in the cards. For labeled diagrams you want to actively recall, image occlusion masks each label one at a time.',
    },
    {
      q: 'Can 2anki write cards from paragraphs, not just bullets?',
      a: 'Yes, on the Unlimited plan. AI drafts question-and-answer cards from prose-heavy chapters, and you review and edit them before studying.',
    },
  ],
  relatedLinks: [
    { label: 'PDF to Anki converter', href: '/convert/pdf-to-anki?ref=ai' },
    {
      label: 'How to convert a PDF to Anki',
      href: '/answers/pdf-to-anki?ref=ai',
    },
    {
      label: 'Make image occlusion cards',
      href: '/answers/image-occlusion-anki?ref=ai',
    },
    { label: 'Pricing — Unlimited plan', href: '/pricing?ref=ai' },
  ],
};

export const ANSWERS_PAGES: ReadonlyMap<string, AnswerConfig> = new Map([
  ['convert-notion-to-anki', convertNotionToAnki],
  ['notion-to-anki-sync', notionToAnkiSync],
  ['pdf-to-anki', pdfToAnki],
  ['quizlet-to-anki', quizletToAnki],
  ['fsrs-explained', fsrsExplained],
  ['lecture-notes-to-anki', lectureNotesToAnki],
  ['word-to-anki', wordToAnki],
  ['image-occlusion-anki', imageOcclusionAnki],
  ['google-docs-to-anki', googleDocsToAnki],
  ['handwritten-notes-to-anki', handwrittenNotesToAnki],
  ['textbook-to-anki', textbookToAnki],
]);
