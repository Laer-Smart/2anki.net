import type { LandingCopy } from '../types';
import { ankiFidelityProof } from './ankiFidelityProof';

const markdownCopy: LandingCopy = {
  relatedLinks: [
    { label: 'Convert Notion pages to Anki', href: '/notion-to-anki' },
    { label: 'Convert an HTML file to Anki', href: '/convert/html-to-anki' },
    { label: 'Convert a PDF to Anki', href: '/pdf-to-anki' },
    { label: 'Browse every converter', href: '/convert' },
  ],
  pathname: '/markdown-to-anki',
  title: 'Markdown to Anki — decks that open clean in Anki | 2anki',
  description:
    'Convert Markdown or Obsidian notes to an Anki deck that opens clean — code blocks intact, cloze clickable, bullets become cards.',
  h1: 'Turn Markdown notes into Anki cards',
  subhead:
    'Drop a .md file and download a deck — bullets and Q/A pairs come across.',
  whatComesAcross: ankiFidelityProof,
  faqs: [
    {
      q: 'How are cards made from my Markdown?',
      a: "Each top-level bullet becomes a card front. A nested bullet underneath becomes the answer. The first heading names the deck. There's a full guide in the docs.",
    },
    {
      q: 'Can I write the cards as Q/A pairs instead of bullets?',
      a: "Yes — write them as 'Q: question' followed by 'A: answer' on the next line and we'll detect the pattern. Mix and match with bullet-style cards in the same file.",
    },
    {
      q: 'Does it handle code blocks and LaTeX?',
      a: 'Triple-backtick code blocks come across as plain text inside the card — the content is preserved, the monospace styling is not. LaTeX inside $...$ and $$...$$ renders if you have MathJax enabled in Anki — turn it on in card template settings.',
    },
    {
      q: 'What if my file has thousands of bullets?',
      a: "We'll convert all of them. Big files take longer — usually under a minute for 1 000 cards. The free upload limit is 100MB; over that, split the file or upload a zip of smaller files.",
    },
  ],
};

export default markdownCopy;
