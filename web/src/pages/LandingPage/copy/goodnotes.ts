import type { LandingCopy } from '../types';

const goodnotesCopy: LandingCopy = {
  pathname: '/goodnotes-to-anki',
  title: 'GoodNotes to Anki — turn notebooks into flashcards | 2anki',
  description:
    'Export your GoodNotes notebook as PDF and get an Anki deck. The text in your notes becomes cards. No copy-pasting.',
  h1: 'Turn GoodNotes into Anki flashcards',
  subhead:
    'Export your notebook as PDF, drop it here, and download an Anki deck.',
  faqs: [
    {
      q: 'How do I export from GoodNotes?',
      a: 'Open the notebook, tap the share icon, choose Export, and pick PDF. Save the file, then drop it on this page. We read the PDF — there is no separate GoodNotes import.',
    },
    {
      q: 'Will it read my handwriting?',
      a: 'Only if the PDF has a text layer. Typed notes always do. For handwriting, turn on GoodNotes handwriting recognition before you export, or run the PDF through an OCR tool first — without a text layer there is nothing for us to read.',
    },
    {
      q: 'How does it pick what becomes a card?',
      a: 'Headings become deck and tag names. Short lines and bullet points become card fronts; the line or indent that follows becomes the back. You can edit every card in Anki after.',
    },
    {
      q: 'Can I convert a whole notebook at once?',
      a: 'Yes, but long notebooks make large decks. Export one section at a time when you can — easier to review and Anki handles a 500-card deck better than a 50 000-card one.',
    },
  ],
};

export default goodnotesCopy;
