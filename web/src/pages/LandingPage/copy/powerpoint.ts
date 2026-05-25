import type { LandingCopy } from '../types';

const powerpointCopy: LandingCopy = {
  pathname: '/powerpoint-to-anki',
  title: 'PowerPoint to Anki — turn slides into flashcards | 2anki',
  description:
    'Upload a .pptx and get an Anki deck. Slide text becomes cards, speaker notes carry across. Works with Google Slides exports too.',
  h1: 'Make Anki flashcards from a PowerPoint',
  subhead:
    'Drop a .pptx and 2anki reads the slide text and speaker notes you can turn into cards.',
  faqs: [
    {
      q: 'Which slide content becomes a card?',
      a: 'The text on each slide — titles, bullets, and body text. A slide title becomes the front and its bullets become the back, so one slide usually maps to one card. You can edit everything in Anki afterward.',
    },
    {
      q: 'Do speaker notes come across?',
      a: 'Yes. The notes under each slide are read alongside the slide text, so the context you wrote for yourself ends up on the card instead of being lost in the deck file.',
    },
    {
      q: 'I made my slides in Google Slides — does that work?',
      a: 'Yes. In Google Slides choose File, then Download, then Microsoft PowerPoint (.pptx). Drop that file here and it converts the same way as a native PowerPoint.',
    },
    {
      q: 'What happens to image-only slides?',
      a: 'Slides with no text — a full-bleed diagram or photo — have nothing for us to read, so they produce no card. Add a title or a line of notes to that slide if you want it to become a card.',
    },
  ],
};

export default powerpointCopy;
