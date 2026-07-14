import type { LandingCopy } from '../types';
import { ankiFidelityProof } from './ankiFidelityProof';

const nclexCopy: LandingCopy = {
  relatedLinks: [
    {
      label: 'Make nursing flashcards from lecture slides',
      href: '/nursing-flashcards',
    },
    {
      label: 'Turn your First Aid notes into Step 1 cards',
      href: '/step1-anki',
    },
    { label: 'Convert a PDF to Anki', href: '/pdf-to-anki' },
    { label: 'Browse every converter', href: '/convert' },
  ],
  pathname: '/nclex-anki',
  title: 'NCLEX Anki cards from your review notes — 2anki',
  description:
    'Turn your Saunders and UWorld notes, lab values, and med lists into clean NCLEX Anki cards. Built from your own material — no invented facts, no junk. | 2anki',
  h1: 'Turn your NCLEX review notes into Anki cards you control',
  subhead:
    'Drop a PDF or Notion export of your Saunders, UWorld, or ATI notes — lab values, med suffixes, priority and delegation. 2anki builds clean cards from your material, not from a guess.',
  whatComesAcross: ankiFidelityProof,
  faqs: [
    {
      q: 'Can it handle my lab values and med lists?',
      a: 'Yes. A table of lab values or a med list in your PDF, Notion page, or CSV becomes one card per row — the value on the front, the range or nursing consideration on the back. You control the split, and every card is editable in Anki after import.',
    },
    {
      q: 'Does it write SATA questions on its own?',
      a: 'No, and that is the point. 2anki reads what you wrote — it does not invent NCLEX-style questions or facts. Your notes become cards you can trust; the rationale you wrote for a select-all-that-apply item comes across on the card.',
    },
    {
      q: 'What can I upload?',
      a: 'A PDF with a text layer, a Notion export, PowerPoint, Markdown, or CSV. Notes you typed while working through Saunders, UWorld, or ATI export cleanly; scanned handouts need OCR first — macOS Preview and Adobe Acrobat both add a text layer.',
    },
    {
      q: 'How is this different from a premade NCLEX deck?',
      a: "A premade deck covers someone else's outline. Cards from your own review notes target what you flagged — the labs you keep missing, the meds you confuse. Import them next to any shared NCLEX deck; nothing is overwritten.",
    },
  ],
};

export default nclexCopy;
