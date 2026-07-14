import type { LandingCopy } from '../types';
import { ankiFidelityProof } from './ankiFidelityProof';

const mcatCopy: LandingCopy = {
  relatedLinks: [
    {
      label: 'Turn your First Aid notes into Step 1 cards',
      href: '/step1-anki',
    },
    { label: 'Make NCLEX Anki cards from your notes', href: '/nclex-anki' },
    { label: 'Convert a PDF to Anki', href: '/pdf-to-anki' },
    { label: 'Browse every converter', href: '/convert' },
  ],
  pathname: '/mcat-anki',
  title: 'MCAT Anki cards from your content review — 2anki',
  description:
    'Turn your content-review notes, amino acid sheets, and orgo reactions into clean MCAT Anki cards. Built from your own material — no invented facts. | 2anki',
  h1: 'Turn your MCAT content review into Anki cards you control',
  subhead:
    'Drop a PDF or Notion export of your content-review notes — amino acids, orgo reactions, psych and soc terms. 2anki builds clean cards from your material, not from a guess.',
  whatComesAcross: ankiFidelityProof,
  faqs: [
    {
      q: 'Can I use it alongside Milesdown or Jack Sparrow?',
      a: 'Yes. 2anki builds a separate deck from your own content review; import it next to Milesdown, Jack Sparrow, or any premade MCAT deck. Nothing is overwritten, and the topics those decks miss get their own cards.',
    },
    {
      q: 'Does it invent content or read my notes?',
      a: 'It reads your notes. Upload conversion is deterministic — cards come from the text in your file, not from a topic name. Your amino acid table, your orgo mechanism, your psych term list become cards that match what you actually studied.',
    },
    {
      q: 'What about equations and diagrams?',
      a: 'Diagrams embedded in your slides or Notion page come across as images inside the card. Equations render as the text or image you wrote them as, and every card is editable in Anki after import.',
    },
    {
      q: 'Should I convert all of content review at once?',
      a: 'Upload one subject at a time — one biochem chapter, one orgo topic — rather than the whole MCAT in one file. Anki schedules 500-card decks far better than 5 000-card ones.',
    },
  ],
};

export default mcatCopy;
