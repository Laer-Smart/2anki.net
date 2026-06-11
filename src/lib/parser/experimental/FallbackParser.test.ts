import FallbackParser from './FallbackParser';

describe('FallbackParser.htmlToTextWithNewlines', () => {
  it('returns empty array and logs warning when html is undefined', () => {
    const parser = new FallbackParser([]);
    const spy = jest.spyOn(console, 'warn').mockImplementation();
    const result = parser.htmlToTextWithNewlines(undefined as any);
    expect(result).toEqual([]);
    expect(spy).toHaveBeenCalledWith(
      '[FallbackParser] htmlToTextWithNewlines called with invalid html:',
      undefined
    );
    spy.mockRestore();
  });

  it('returns empty array and logs warning when html is null', () => {
    const parser = new FallbackParser([]);
    const spy = jest.spyOn(console, 'warn').mockImplementation();
    const result = parser.htmlToTextWithNewlines(null as any);
    expect(result).toEqual([]);
    expect(spy).toHaveBeenCalledWith(
      '[FallbackParser] htmlToTextWithNewlines called with invalid html:',
      null
    );
    spy.mockRestore();
  });

  it('returns empty array and logs warning when html is empty string', () => {
    const parser = new FallbackParser([]);
    const spy = jest.spyOn(console, 'warn').mockImplementation();
    const result = parser.htmlToTextWithNewlines('');
    expect(result).toEqual([]);
    expect(spy).toHaveBeenCalledWith(
      '[FallbackParser] htmlToTextWithNewlines called with invalid html:',
      ''
    );
    spy.mockRestore();
  });

  it('parses simple ul/li html correctly', () => {
    const parser = new FallbackParser([]);
    const html = '<ul><li>Item 1</li><li>Item 2</li></ul>';
    const result = parser.htmlToTextWithNewlines(html);
    expect(result).toEqual(['• Item 1\n• Item 2\n']);
  });
});

describe('FallbackParser tab-separated text', () => {
  it('creates cards from tab-separated lines in a .txt file', () => {
    const tabContent = 'What is the capital of France?\tParis\nWhat is 2+2?\t4';
    const parser = new FallbackParser([
      { name: 'my_deck.txt', contents: Buffer.from(tabContent) },
    ]);
    const settings = {} as any;
    const decks = parser.run(settings);
    expect(decks).toHaveLength(1);
    expect(decks[0].cards).toHaveLength(2);
    expect(decks[0].cards[0].name).toBe('What is the capital of France?');
    expect(decks[0].cards[0].back).toBe('Paris');
    expect(decks[0].cards[1].name).toBe('What is 2+2?');
    expect(decks[0].cards[1].back).toBe('4');
  });

  it('skips lines without tabs in tab-separated text', () => {
    const tabContent = 'What is 1+1?\t2\nThis line has no tab\nWhat is 3+3?\t6';
    const parser = new FallbackParser([
      { name: 'deck.txt', contents: Buffer.from(tabContent) },
    ]);
    const decks = parser.run({} as any);
    expect(decks).toHaveLength(1);
    expect(decks[0].cards).toHaveLength(2);
  });

  it('prefers tab-separated parsing over bullet list parsing for tab content', () => {
    const tabContent = 'Front1\tBack1\nFront2\tBack2';
    const parser = new FallbackParser([
      { name: 'study.txt', contents: Buffer.from(tabContent) },
    ]);
    const decks = parser.run({} as any);
    expect(decks).toHaveLength(1);
    expect(decks[0].cards[0].name).toBe('Front1');
    expect(decks[0].cards[0].back).toBe('Back1');
  });
});

describe('FallbackParser nested lists', () => {
  it('does not double-count items in a nested list', () => {
    const parser = new FallbackParser([]);
    const html = `<ul><li>Outer<ul><li>Inner</li></ul></li></ul>`;
    const result = parser.htmlToTextWithNewlines(html);

    const innerOccurrences = result.join('\n').split('Inner').length - 1;
    expect(innerOccurrences).toBe(1);
  });
});
