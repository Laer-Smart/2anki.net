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

export interface AnswerConfig {
  slug: string;
  title: string;
  description: string;
  h1: string;
  intro: string;
  sections: AnswerSection[];
  relatedLinks: ReadonlyArray<{ label: string; href: string }>;
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

export const ANSWERS_PAGES: ReadonlyMap<string, AnswerConfig> = new Map([
  ['convert-notion-to-anki', convertNotionToAnki],
  ['notion-to-anki-sync', notionToAnkiSync],
  ['pdf-to-anki', pdfToAnki],
  ['quizlet-to-anki', quizletToAnki],
  ['fsrs-explained', fsrsExplained],
]);
