import type { LandingCopy } from '../types';

const japaneseCopy: LandingCopy = {
  relatedLinks: [
    {
      label: 'Notion → Anki for Japanese: the full guide',
      href: '/documentation/cards/notion-to-anki-japanese',
    },
    { label: 'Move Pleco flashcards to Anki', href: '/convert/pleco-to-anki' },
    {
      label: 'Move Language Reactor saves to Anki',
      href: '/convert/language-reactor-to-anki',
    },
    { label: 'Convert Notion pages to Anki', href: '/notion-to-anki' },
    { label: 'Browse every converter', href: '/convert' },
  ],
  pathname: '/anki-for-japanese',
  title: 'Notion to Anki for Japanese learners — 2anki',
  description:
    'Turn your Notion sentence-mining and vocab notes into Anki decks. Images, audio, and readings come across as you typed them. | 2anki',
  h1: 'Notion to Anki for Japanese and language learning',
  subhead:
    'Drop a Notion page of mined sentences or vocab. Screenshots, audio, and readings come across as you wrote them.',
  whatComesAcross: [
    {
      title: 'Screenshots and images',
      body: 'Manga panels, subtitle screenshots, and reference images embedded in your Notion notes come across as images inside the card, bundled into the deck so they render offline.',
    },
    {
      title: 'Audio files',
      body: 'An audio file attached in Notion — a clip from a show, a recorded sentence, a pronunciation — is downloaded and packed into the deck, so the card plays it the same on every device.',
    },
    {
      title: 'Readings and furigana as you typed them',
      body: 'Whatever you wrote stays: furigana in brackets, kana over kanji, pitch notation, romaji. 2anki preserves your text — it does not add or change readings, so the card shows exactly what you mined.',
    },
    {
      title: 'Bold and italic emphasis',
      body: 'The word you bolded in a sentence, the part of speech you italicised — emphasis carries through, so the formatting you used to mark the target stays on the card.',
    },
  ],
  faqs: [
    {
      q: 'Does audio from my Notion notes come across?',
      a: 'Yes, when the audio is an actual file attached in Notion. 2anki downloads it and packs it into the deck, so the card plays it offline on every device. A link to an external site stays a link — only attached files become deck audio. 2anki does not generate text-to-speech during conversion; Anki itself can read cards aloud at review time with its on-device voice, including Japanese.',
    },
    {
      q: 'Can I mine sentences from Notion?',
      a: 'Yes. Write each mined sentence as a toggle: the sentence on the toggle line, the meaning, vocab, and any audio or screenshot inside it. Each toggle becomes one card — sentence on the front, the rest on the back. The same page can hold word cards and sentence cards side by side. The full setup is in the guide.',
    },
    {
      q: 'Does it add furigana or look up readings automatically?',
      a: 'No. 2anki does not add furigana, look up readings, or color pitch accent — it converts what you wrote. If you want furigana on a card, type it in Notion (Yomitan or a dictionary add-on can help you fill it in there), and it comes across exactly as typed. Keeping the readings yours means a card never shows a wrong auto-guess.',
    },
    {
      q: 'Will my Kaishi or RTK-style cards work?',
      a: 'The decks themselves are already built — 2anki does not replace Kaishi 1.5k, RRTK, or JLab. What it does is turn your own notes into a deck you study alongside them. You pick the note type during conversion, so cards land on a template that matches how you study, and you can rename the note type to plug in your own.',
    },
    {
      q: 'How is this different from Yomitan or Migaku?',
      a: 'Yomitan and Migaku create cards while you read, from a browser or a video. 2anki works from notes you already keep in Notion — lecture summaries, grammar pages, mined sentences with your own context. They are not rivals: mine with Yomitan, write up the hard ones in Notion, then convert the page here when you want a clean deck.',
    },
  ],
};

export default japaneseCopy;
