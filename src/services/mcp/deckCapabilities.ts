export interface DeckCapabilityNoteType {
  name: string;
  whenToUse: string;
}

export interface DeckCapabilityOption {
  name: string;
  type: string;
  description: string;
}

export interface DeckCapabilities {
  noteTypes: DeckCapabilityNoteType[];
  options: DeckCapabilityOption[];
  inputKinds: string[];
  conventions: string[];
}

export const DECK_CAPABILITIES: DeckCapabilities = {
  noteTypes: [
    {
      name: 'basic',
      whenToUse: 'A question on the front, its answer on the back.',
    },
    {
      name: 'basic-reversed',
      whenToUse:
        'Two cards per fact — question to answer and answer to question. Good for vocabulary.',
    },
    {
      name: 'cloze',
      whenToUse:
        'Fill-in-the-blank cards. The text must contain {{c1::hidden term}} markup for a card to become cloze.',
    },
    {
      name: 'input',
      whenToUse:
        'The learner types the answer during review. Good for exact-recall terms and vocabulary.',
    },
    {
      name: 'mcq',
      whenToUse: 'Multiple-choice questions with one correct option.',
    },
  ],
  options: [
    {
      name: 'noteType',
      type: "'basic' | 'basic-reversed' | 'cloze' | 'input' | 'mcq'",
      description:
        'The Anki note type to build. Cloze also needs {{c1::}} markup in the text.',
    },
    {
      name: 'tags',
      type: 'string[]',
      description: 'Anki tags applied to every card in the deck.',
    },
    {
      name: 'deckName',
      type: 'string',
      description:
        'Name the deck. Use :: to nest subdecks, e.g. MS3::Cardiology.',
    },
    {
      name: 'splitByHeadings',
      type: 'boolean',
      description:
        'Turn each heading, toggle, and list on the page into its own subdeck instead of one deck.',
    },
    {
      name: 'styleTemplate',
      type: "'specialstyle' | 'nostyle' | 'abhiyan' | 'alex_deluxe'",
      description:
        'The visual style for the cards. nostyle strips styling; specialstyle is the default look.',
    },
    {
      name: 'tts',
      type: "{ enabled: boolean, language?: string, side?: 'front' | 'back' | 'both' }",
      description:
        'Add text-to-speech playback. Give a language (e.g. ja-JP) for a fixed voice, or leave it off to auto-detect.',
    },
  ],
  inputKinds: [
    'text — Markdown or HTML passed directly',
    'url — a public URL to an HTML, Markdown, CSV, or other supported file',
  ],
  conventions: [
    'Cloze cards require {{c1::...}} markup in the text; without it, cloze falls back to basic.',
    'Deck names use :: to nest subdecks, e.g. Spanish::Verbs::Irregular.',
    'Only these curated options are honored; unknown keys are ignored and never bypass account limits.',
  ],
};
