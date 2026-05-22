import {
  looksLikeEmptyContentExplanation,
  EMPTY_CONTENT_USER_MESSAGE,
  parseDeckResponse,
  rewriteAudioAnchors,
  normalizeTag,
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
