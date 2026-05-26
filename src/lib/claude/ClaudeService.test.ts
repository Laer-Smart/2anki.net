import {
  looksLikeEmptyContentExplanation,
  EMPTY_CONTENT_USER_MESSAGE,
  parseDeckResponse,
  rewriteAudioAnchors,
  normalizeTag,
  SYSTEM_PROMPT,
  buildUserMessage,
  buildFieldMappingPromptFragment,
  dedupeCardsByFront,
  type DeckInfo,
} from './ClaudeService';

describe('looksLikeEmptyContentExplanation', () => {
  it('detects the reported empty-page explanation', () => {
    const cleaned =
      '{ }\n\nThe provided HTML content is a flashcard application interface template with UI elements (buttons, progress bars, card display areas) but has no actual question-and-answer content to convert into flashcards. The document consists only of structural elements like divs, buttons, and placeholder elements with IDs for dynamic content injection.';
    expect(looksLikeEmptyContentExplanation(cleaned)).toBe(true);
  });

  it('detects a variety of no-content phrasings', () => {
    const samples = [
      'I cannot find any flashcard material in this document.',
      "I couldn't find any question-and-answer pairs to extract.",
      'The page has no extractable flashcard content.',
      'Nothing to convert — the page appears to be a template.',
    ];
    for (const sample of samples) {
      expect(looksLikeEmptyContentExplanation(sample)).toBe(true);
    }
  });

  it('does not match a malformed but real attempt at JSON', () => {
    const truncated =
      '[{"deck":"Biology","cards":[{"q":"What is mitosis","a":"Cell div';
    expect(looksLikeEmptyContentExplanation(truncated)).toBe(false);
  });

  it('does not match an empty JSON array', () => {
    expect(looksLikeEmptyContentExplanation('[]')).toBe(false);
  });
});

describe('parseDeckResponse', () => {
  const deck = [{ deck: 'Test', cards: [{ q: 'Q', a: 'A' }] }];
  const deckJson = JSON.stringify(deck);

  it('parses clean JSON', () => {
    expect(parseDeckResponse(deckJson, deckJson, 0)).toEqual(deck);
  });

  it('parses JSON followed by Claude explanation prose (the prod failure pattern)', () => {
    const cleaned = `${deckJson}\n\nI've created flashcards for all key concepts.`;
    expect(parseDeckResponse(cleaned, cleaned, 0)).toEqual(deck);
  });

  it('parses [] followed by explanation text as an empty deck (downstream no-cards error handles it)', () => {
    const cleaned = '[]\n\nThe document appears to be a course overview with no actual Q&A content to convert. I cannot find any flashcard material.';
    expect(parseDeckResponse(cleaned, cleaned, 0)).toEqual([]);
  });

  it('throws generic error for truncated/invalid JSON', () => {
    const cleaned = '[{"deck":"Bio","cards":[{"q":"What is';
    expect(() => parseDeckResponse(cleaned, cleaned, 0)).toThrow('Claude returned invalid JSON');
  });

  it('throws generic error when there is no ] at all', () => {
    expect(() => parseDeckResponse('not json', 'not json', 0)).toThrow('Claude returned invalid JSON');
  });

  it('recovers a card whose value contains an unescaped ASCII " (the German-quote prod failure)', () => {
    // Claude emits raw ASCII " when source HTML has „kaputt macht" (German low/high quotes).
    // The premature " closes the string and JSON.parse dies on the following character.
    const broken =
      '[{"deck":"Corporate Finance","cards":[{"q":"Erkläre","a":"Linie „kaputt macht".</p> mehr text"}]}]';
    expect(() => JSON.parse(broken)).toThrow();
    const parsed = parseDeckResponse(broken, broken, 0);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].deck).toBe('Corporate Finance');
    expect(parsed[0].cards).toHaveLength(1);
    expect(parsed[0].cards[0].q).toBe('Erkläre');
    expect(parsed[0].cards[0].a).toContain('kaputt macht');
  });

  it('still throws when jsonrepair cannot recover the response', () => {
    const unrepairable = '[{"deck":"X","cards":[{"q":"a","a"';
    expect(() => parseDeckResponse(unrepairable, unrepairable, 0)).toThrow(
      'Claude returned invalid JSON'
    );
  });

  it('tolerates leading, interior, and trailing whitespace inside the JSON portion', () => {
    const padded = `  \n\t${deckJson}   \n  `;
    expect(parseDeckResponse(padded, padded, 0)).toEqual(deck);
  });

  it('preserves literal backticks inside card content (nested-fence robustness)', () => {
    const withBackticks =
      '[{"deck":"Shell","cards":[{"q":"List files","a":"Run `ls -la` to see hidden files"}]}]';
    const parsed = parseDeckResponse(withBackticks, withBackticks, 0);
    expect(parsed[0].cards[0].a).toBe('Run `ls -la` to see hidden files');
  });

  it('emits a structured warning when trailing prose is stripped (model-drift signal)', () => {
    const warnSpy = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    try {
      const cleaned = `${deckJson}\n\nI've created flashcards for all key concepts.`;
      parseDeckResponse(cleaned, cleaned, 7);
      expect(warnSpy).toHaveBeenCalledWith(
        '[Claude] Trailing prose stripped',
        expect.objectContaining({ chunkIndex: 7, strippedBytes: expect.any(Number) })
      );
      const callArg = warnSpy.mock.calls.find(
        ([msg]) => msg === '[Claude] Trailing prose stripped'
      )![1] as { strippedBytes: number };
      expect(callArg.strippedBytes).toBeGreaterThan(0);
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('does not warn about trailing prose when JSON parses cleanly with no trailing content', () => {
    const warnSpy = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    try {
      parseDeckResponse(deckJson, deckJson, 0);
      expect(warnSpy).not.toHaveBeenCalledWith(
        '[Claude] Trailing prose stripped',
        expect.anything()
      );
    } finally {
      warnSpy.mockRestore();
    }
  });
});

describe('rewriteAudioAnchors', () => {
  it('replaces an mp3 anchor with a [sound:] token and lists the filename', () => {
    const { back, audioFilenames } = rewriteAudioAnchors(
      '<p>Listen: <a href="pronunciation.mp3">play</a></p>'
    );
    expect(audioFilenames).toEqual(['pronunciation.mp3']);
    expect(back).toContain('[sound:pronunciation.mp3]');
    expect(back).not.toContain('<a href');
  });

  it('strips the wrapping <figure> when present', () => {
    const { back } = rewriteAudioAnchors(
      '<figure><a href="word.ogg">🔊</a><figcaption>word</figcaption></figure>'
    );
    expect(back).not.toContain('<figure');
    expect(back).not.toContain('<a');
    expect(back).toContain('[sound:word.ogg]');
  });

  it('deduplicates if the same file is referenced twice on one card', () => {
    const { audioFilenames, back } = rewriteAudioAnchors(
      '<a href="a.mp3">x</a><a href="a.mp3">y</a>'
    );
    expect(audioFilenames).toEqual(['a.mp3']);
    expect(back.match(/\[sound:a\.mp3\]/g)).toHaveLength(1);
  });

  it('leaves http(s) audio links alone', () => {
    const input = '<a href="https://example.com/hello.mp3">play</a>';
    const { back, audioFilenames } = rewriteAudioAnchors(input);
    expect(audioFilenames).toEqual([]);
    expect(back).toContain(input);
  });

  it('decodes URL-encoded filenames before emitting the sound token', () => {
    const { back, audioFilenames } = rewriteAudioAnchors(
      '<a href="my%20word.m4a">play</a>'
    );
    expect(audioFilenames).toEqual(['my word.m4a']);
    expect(back).toContain('[sound:my word.m4a]');
  });

  it('supports ogg, wav, flac, m4a, aac, opus', () => {
    const exts = ['ogg', 'wav', 'flac', 'm4a', 'aac', 'opus'];
    for (const ext of exts) {
      const { audioFilenames } = rewriteAudioAnchors(
        `<a href="clip.${ext}">x</a>`
      );
      expect(audioFilenames).toEqual([`clip.${ext}`]);
    }
  });

  it('does nothing when the card has no audio links', () => {
    const input = '<p>No audio here</p><img src="x.png"/>';
    const { back, audioFilenames } = rewriteAudioAnchors(input);
    expect(audioFilenames).toEqual([]);
    expect(back).toBe(input);
  });
});

describe('normalizeTag', () => {
  it('lowercases an uppercase tag', () => {
    expect(normalizeTag('Enzymes')).toBe('enzymes');
  });

  it('replaces spaces with underscores', () => {
    expect(normalizeTag('michaelis menten')).toBe('michaelis_menten');
  });

  it('strips characters outside [a-z0-9_]', () => {
    expect(normalizeTag('cell-biology!')).toBe('cellbiology');
  });

  it('caps the tag at 32 characters', () => {
    const long = 'a'.repeat(40);
    expect(normalizeTag(long)).toHaveLength(32);
  });

  it('converts a mixed-case tag with spaces into normalized form', () => {
    expect(normalizeTag('Michaelis Menten Kinetics')).toBe('michaelis_menten_kinetics');
  });

  it('returns an empty string for a tag that is all punctuation', () => {
    expect(normalizeTag('!!!')).toBe('');
  });
});

describe('parseDeckResponse — tags', () => {
  it('carries tags from a Claude response through to the parsed deck', () => {
    const raw = JSON.stringify([
      {
        deck: 'Biochemistry',
        cards: [
          { q: 'What is an enzyme?', a: 'A biological catalyst', tags: ['enzymes', 'kinetics'] },
          { q: 'What is ATP?', a: 'Adenosine triphosphate' },
        ],
      },
    ]);
    const parsed = parseDeckResponse(raw, raw, 0);
    expect(parsed[0].cards[0].tags).toEqual(['enzymes', 'kinetics']);
    expect(parsed[0].cards[1].tags).toBeUndefined();
  });
});

describe('EMPTY_CONTENT_USER_MESSAGE', () => {
  it('is friendly and free of technical jargon', () => {
    expect(EMPTY_CONTENT_USER_MESSAGE).toMatch(/Claude/);
    expect(EMPTY_CONTENT_USER_MESSAGE.toLowerCase()).not.toMatch(
      /html|<div|dom|dynamic content injection/
    );
    expect(EMPTY_CONTENT_USER_MESSAGE.toLowerCase()).toContain('notion page');
    expect(EMPTY_CONTENT_USER_MESSAGE.toLowerCase()).toMatch(
      /empty|layout element/
    );
  });
});

describe('SYSTEM_PROMPT — Anki math conventions', () => {
  it('specifies \\(...\\) for inline math', () => {
    expect(SYSTEM_PROMPT).toContain('\\(...\\)');
  });

  it('specifies \\[...\\] for display math', () => {
    expect(SYSTEM_PROMPT).toContain('\\[...\\]');
  });

  it('forbids $...$ inline delimiter', () => {
    expect(SYSTEM_PROMPT).toMatch(/NEVER\s+\$\.\.\.\$/);
  });

  it('forbids $$...$$ display delimiter', () => {
    expect(SYSTEM_PROMPT).toMatch(/NEVER\s+\$\$\.\.\.\$\$/);
  });

  it('includes a chemistry example using \\ce{}', () => {
    expect(SYSTEM_PROMPT).toContain('\\ce{');
  });
});

describe('buildFieldMappingPromptFragment', () => {
  it('returns empty string when fieldMapping is undefined', () => {
    expect(buildFieldMappingPromptFragment(undefined)).toBe('');
  });

  it('returns empty string when fields array is empty', () => {
    expect(buildFieldMappingPromptFragment({ templateName: 'n2a-basic', fields: [] })).toBe('');
  });

  it('includes each field name and instruction', () => {
    const fragment = buildFieldMappingPromptFragment({
      templateName: 'n2a-basic',
      fields: [
        { name: 'Front', instruction: 'The question or term' },
        { name: 'Back', instruction: 'The answer or definition' },
      ],
    });
    expect(fragment).toContain('Front');
    expect(fragment).toContain('The question or term');
    expect(fragment).toContain('Back');
    expect(fragment).toContain('The answer or definition');
  });

  it('includes the template name', () => {
    const fragment = buildFieldMappingPromptFragment({
      templateName: 'n2a-cloze',
      fields: [{ name: 'Text', instruction: 'Cloze sentence' }],
    });
    expect(fragment).toContain('n2a-cloze');
  });
});

describe('buildUserMessage — field mapping', () => {
  const content = '<p>Test</p>';
  const noMedia: string[] = [];

  it('appends field mapping section when fieldMapping is provided', () => {
    const msg = buildUserMessage(content, noMedia, undefined, '', undefined, {
      templateName: 'n2a-basic',
      fields: [
        { name: 'Front', instruction: 'The question or term' },
        { name: 'Back', instruction: 'The answer or definition' },
      ],
    });
    expect(msg).toContain('Field mapping');
    expect(msg).toContain('Front');
    expect(msg).toContain('Back');
  });

  it('omits field mapping section when fieldMapping is undefined', () => {
    const msg = buildUserMessage(content, noMedia, undefined, '', undefined, undefined);
    expect(msg).not.toContain('Field mapping');
  });

  it('places field mapping after additional instructions when both are present', () => {
    const msg = buildUserMessage(content, noMedia, 'Custom rule.', '', undefined, {
      templateName: 'n2a-basic',
      fields: [{ name: 'Front', instruction: 'term' }, { name: 'Back', instruction: 'def' }],
    });
    const instrIdx = msg.indexOf('Additional instructions:');
    const mappingIdx = msg.indexOf('Field mapping');
    expect(instrIdx).toBeGreaterThan(-1);
    expect(mappingIdx).toBeGreaterThan(instrIdx);
  });
});

describe('buildUserMessage — card size suffix', () => {
  const content = '<p>Test</p>';
  const noMedia: string[] = [];

  it('appends short size instruction when cardSize is short', () => {
    const msg = buildUserMessage(content, noMedia, undefined, '', 'short');
    expect(msg).toContain('1 fact per card');
    expect(msg).toContain('80 characters');
  });

  it('appends medium size instruction when cardSize is medium', () => {
    const msg = buildUserMessage(content, noMedia, undefined, '', 'medium');
    expect(msg).toContain('1-2 facts per card');
    expect(msg).toContain('160 characters');
  });

  it('appends detailed size instruction when cardSize is detailed', () => {
    const msg = buildUserMessage(content, noMedia, undefined, '', 'detailed');
    expect(msg).toContain('3-4 facts per card');
    expect(msg).toContain('320 characters');
  });

  it('omits size section when cardSize is undefined', () => {
    const msg = buildUserMessage(content, noMedia, undefined, '', undefined);
    expect(msg).not.toContain('Card size:');
  });

  it('includes size section after additional instructions', () => {
    const msg = buildUserMessage(content, noMedia, 'Extra rule.', '', 'short');
    const instrIdx = msg.indexOf('Additional instructions:');
    const sizeIdx = msg.indexOf('Card size:');
    expect(instrIdx).toBeGreaterThan(-1);
    expect(sizeIdx).toBeGreaterThan(instrIdx);
  });
});

function makeDeck(name: string, cards: Array<{ name: string; back: string }>): DeckInfo {
  return {
    name,
    image: '',
    style: null,
    id: 1,
    settings: {},
    cards: cards.map((c) => ({
      name: c.name,
      back: c.back,
      tags: [],
      cloze: false,
      number: 0,
      enableInput: false,
      answer: '',
      media: [],
    })),
  };
}

describe('dedupeCardsByFront', () => {
  it('removes a card whose front normalizes to the same value as an earlier card', () => {
    const deck = makeDeck('Biology', [
      { name: 'What is mitosis?', back: 'Cell division' },
      { name: '  What is mitosis?  ', back: 'Duplicate from chunk boundary' },
    ]);
    const result = dedupeCardsByFront([deck]);
    expect(result[0].cards).toHaveLength(1);
    expect(result[0].cards[0].back).toBe('Cell division');
  });

  it('normalizes by lowercasing before comparing', () => {
    const deck = makeDeck('Biochemistry', [
      { name: 'What is ATP?', back: 'Adenosine triphosphate' },
      { name: 'WHAT IS ATP?', back: 'Duplicate upper-case variant' },
    ]);
    const result = dedupeCardsByFront([deck]);
    expect(result[0].cards).toHaveLength(1);
    expect(result[0].cards[0].back).toBe('Adenosine triphosphate');
  });

  it('collapses internal whitespace before comparing', () => {
    const deck = makeDeck('Chemistry', [
      { name: 'What is H2O?', back: 'Water' },
      { name: 'What  is  H2O?', back: 'Duplicate collapsed-space variant' },
    ]);
    const result = dedupeCardsByFront([deck]);
    expect(result[0].cards).toHaveLength(1);
  });

  it('keeps cards with distinct fronts intact', () => {
    const deck = makeDeck('Physics', [
      { name: 'What is velocity?', back: 'Speed with direction' },
      { name: 'What is acceleration?', back: 'Rate of change of velocity' },
    ]);
    const result = dedupeCardsByFront([deck]);
    expect(result[0].cards).toHaveLength(2);
  });

  it('dedupes per-deck independently — same front in two different decks is kept in each', () => {
    const deckA = makeDeck('DeckA', [{ name: 'Shared front', back: 'Answer A' }]);
    const deckB = makeDeck('DeckB', [{ name: 'Shared front', back: 'Answer B' }]);
    const result = dedupeCardsByFront([deckA, deckB]);
    expect(result).toHaveLength(2);
    expect(result[0].cards).toHaveLength(1);
    expect(result[1].cards).toHaveLength(1);
  });

  it('handles an empty deck without throwing', () => {
    const deck = makeDeck('Empty', []);
    const result = dedupeCardsByFront([deck]);
    expect(result[0].cards).toHaveLength(0);
  });

  it('logs the number of removed duplicates when dedup occurs', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      const deck = makeDeck('Bio', [
        { name: 'What is a cell?', back: 'Basic unit of life' },
        { name: 'What is a cell?', back: 'Duplicate' },
      ]);
      dedupeCardsByFront([deck]);
      expect(warnSpy).toHaveBeenCalledWith(
        '[Claude] dedupeCardsByFront',
        expect.objectContaining({ deckName: 'Bio', removed: 1 })
      );
    } finally {
      warnSpy.mockRestore();
    }
  });
});
