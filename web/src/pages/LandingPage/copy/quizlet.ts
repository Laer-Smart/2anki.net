import type { LandingCopy } from '../types';
import { ankiFidelityProof } from './ankiFidelityProof';

const quizletCopy: LandingCopy = {
  relatedLinks: [
    {
      label: 'Move Brainscape flashcards to Anki',
      href: '/convert/brainscape-to-anki',
    },
    {
      label: 'Move StudyStack flashcards to Anki',
      href: '/convert/studystack-to-anki',
    },
    {
      label: 'Convert a CSV or Excel sheet to Anki',
      href: '/convert/csv-to-anki',
    },
    { label: 'Browse every converter', href: '/convert' },
  ],
  pathname: '/quizlet-to-anki',
  title: 'Quizlet to Anki — sets that open clean in Anki | 2anki',
  description:
    'Move a Quizlet set into an Anki deck that opens clean — correct fields, no copy-paste. Upload your export, get a .apkg.',
  h1: 'Move your Quizlet set to Anki',
  subhead:
    'Export from Quizlet, drop the file here, and download an Anki deck.',
  whatComesAcross: ankiFidelityProof,
  faqs: [
    {
      q: 'How do I get my set out of Quizlet?',
      a: 'Quizlet\'s export flow has moved several times. Search help.quizlet.com for "export your set" to find the current path. Once you have the text, save it as a .txt file and drop it here.',
    },
    {
      q: 'Do my starred or learned cards come across?',
      a: "The card content does. Quizlet's study state — starred, mastered, in-progress — isn't in the export, so it doesn't transfer. Anki will start each card fresh, which most learners prefer anyway.",
    },
    {
      q: 'What about image-only cards?',
      a: "Image cards work if the export includes image URLs. Quizlet's plain-text export is text-only, so images are skipped. If you have Quizlet Plus, the richer export keeps them.",
    },
    {
      q: "Is this allowed under Quizlet's terms?",
      a: "You're moving your own study material between apps you own accounts on. We don't scrape Quizlet — we only read the file you upload. If you don't have an export, we can't help.",
    },
  ],
};

export default quizletCopy;
