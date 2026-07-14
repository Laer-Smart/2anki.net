import type { LandingCopy } from '../types';
import { ankiFidelityProof } from './ankiFidelityProof';

const step1Copy: LandingCopy = {
  relatedLinks: [
    { label: 'Build USMLE Anki decks from your notes', href: '/usmle-anki' },
    {
      label: 'Turn medical lecture slides into Anki cards',
      href: '/anki-from-medical-lecture-slides',
    },
    { label: 'Make NCLEX Anki cards from your notes', href: '/nclex-anki' },
    { label: 'Convert a PDF to Anki', href: '/pdf-to-anki' },
    { label: 'Browse every converter', href: '/convert' },
  ],
  pathname: '/step1-anki',
  title: 'First Aid and lecture notes into Step 1 Anki cards — 2anki',
  description:
    'Upload your annotated First Aid pages, Pathoma outlines, or lecture PDFs. Get clean, high-yield Step 1 Anki cards built from your notes — nothing invented. | 2anki',
  h1: 'Turn your First Aid annotations and lecture notes into Step 1 cards you control',
  subhead:
    'Anki is the backbone of Step 1 prep. Upload your annotated First Aid pages, Pathoma outlines, or lecture PDFs and get clean, high-yield cards — built from your material, never invented.',
  whatComesAcross: ankiFidelityProof,
  faqs: [
    {
      q: 'Can I keep using AnKing alongside my own cards?',
      a: 'Yes. 2anki builds a separate deck from your own notes — your annotated First Aid, your Pathoma summary, your lecture slides. Import it next to AnKing, Zanki, or any premade Step 1 deck; nothing is overwritten, and the gaps you flagged get their own cards.',
    },
    {
      q: 'Does it invent facts or just read my notes?',
      a: 'It reads your notes. Upload conversion is deterministic — the cards come from the text in your file, not from a topic name or a model guessing. What you annotated is what you review, so spaced repetition reinforces the real high-yield material instead of plausible filler.',
    },
    {
      q: 'What can I upload — a First Aid PDF, Notion, slides?',
      a: 'Any PDF with a text layer (slide exports and annotated First Aid PDFs both have one), a Notion export, PowerPoint, Markdown, or CSV. Scanned pages need OCR first — macOS Preview and Adobe Acrobat both add a text layer.',
    },
    {
      q: 'Should I convert a whole system at once?',
      a: 'Upload one block at a time — one organ system, one Pathoma chapter — rather than all of Step 1 in one file. Anki schedules and shares 500-card decks far more smoothly than 5 000-card ones.',
    },
  ],
};

export default step1Copy;
