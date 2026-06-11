import { guessMarkdownCards } from './guessMarkdownCards';

describe('guessMarkdownCards', () => {
  it('returns null for empty content', () => {
    expect(guessMarkdownCards('')).toBeNull();
  });

  it('returns null when no known pattern is found', () => {
    expect(
      guessMarkdownCards('just some random text\nwith multiple lines')
    ).toBeNull();
  });

  describe('details-summary (Notion export)', () => {
    it('extracts a single card', () => {
      const md = `<details>\n<summary>What is the capital of France?</summary>\nParis\n</details>`;
      const result = guessMarkdownCards(md);
      expect(result).not.toBeNull();
      expect(result!.formatDetected).toBe('details-summary');
      expect(result!.notes).toHaveLength(1);
      expect(result!.notes[0].name).toContain('What is the capital of France?');
      expect(result!.notes[0].back).toContain('Paris');
    });

    it('extracts multiple cards', () => {
      const md = [
        '<details>\n<summary>Q1</summary>\nA1\n</details>',
        '<details>\n<summary>Q2</summary>\nA2\n</details>',
      ].join('\n\n');
      const result = guessMarkdownCards(md);
      expect(result!.notes).toHaveLength(2);
    });

    it('ignores details blocks with empty summary or empty body', () => {
      const md = `<details>\n<summary></summary>\nSome answer\n</details>`;
      expect(guessMarkdownCards(md)).toBeNull();
    });
  });

  describe('heading-body (markdown-anki-decks style)', () => {
    it('extracts cards from ## headings', () => {
      const md = `# Deck\n\n## What is photosynthesis?\n\nThe process by which plants convert sunlight to glucose.\n\n## What is mitosis?\n\nCell division producing two identical daughter cells.`;
      const result = guessMarkdownCards(md);
      expect(result).not.toBeNull();
      expect(result!.formatDetected).toBe('heading-body');
      expect(result!.notes).toHaveLength(2);
      expect(result!.notes[0].name).toContain('photosynthesis');
      expect(result!.notes[0].back).toContain('glucose');
    });

    it('ignores headings with no body', () => {
      const md = `## Question without body\n\n## Another heading\n\nThis one has a body.`;
      const result = guessMarkdownCards(md);
      expect(result!.notes).toHaveLength(1);
    });
  });

  describe('qa-labels style', () => {
    it('extracts Q:/A: pairs', () => {
      const md = `Q: What is the powerhouse of the cell?\nA: The mitochondria.`;
      const result = guessMarkdownCards(md);
      expect(result).not.toBeNull();
      expect(result!.formatDetected).toBe('qa-labels');
      expect(result!.notes).toHaveLength(1);
      expect(result!.notes[0].name).toContain('powerhouse');
      expect(result!.notes[0].back).toContain('mitochondria');
    });

    it('handles multiple Q:/A: pairs', () => {
      const md = `Q: Question one\nA: Answer one\n\nQ: Question two\nA: Answer two`;
      const result = guessMarkdownCards(md);
      expect(result!.notes).toHaveLength(2);
    });

    it('is case-insensitive for Q: and A:', () => {
      const md = `q: Question\na: Answer`;
      const result = guessMarkdownCards(md);
      expect(result!.notes).toHaveLength(1);
    });
  });

  describe('separator style', () => {
    it('extracts cards separated by % and --- (ankdown)', () => {
      const md = `What is the powerhouse of the cell?\n\n%\n\nThe mitochondria.\n\n---\n\nWhat does ATP stand for?\n\n%\n\nAdenosine triphosphate.`;
      const result = guessMarkdownCards(md);
      expect(result).not.toBeNull();
      expect(result!.formatDetected).toBe('separator');
      expect(result!.notes).toHaveLength(2);
    });

    it('extracts cards separated by --- only (Obsidian ruled style)', () => {
      const md = `What is the powerhouse of the cell?\n\n---\n\nThe mitochondria.`;
      const result = guessMarkdownCards(md);
      expect(result).not.toBeNull();
      expect(result!.formatDetected).toBe('separator');
      expect(result!.notes).toHaveLength(1);
    });

    it('ignores front matter --- delimiters', () => {
      const md = `---\ntitle: My Notes\n---\n\nSome random text with no cards.`;
      expect(guessMarkdownCards(md)).toBeNull();
    });
  });

  describe('inline double-colon style', () => {
    it('extracts :: pairs', () => {
      const md = `Photosynthesis::Process by which plants convert light to glucose\nMitosis::Cell division producing identical cells`;
      const result = guessMarkdownCards(md);
      expect(result).not.toBeNull();
      expect(result!.formatDetected).toBe('inline-double-colon');
      expect(result!.notes).toHaveLength(2);
      expect(result!.notes[0].name).toContain('Photosynthesis');
    });

    it('ignores lines with URLs containing ://', () => {
      const md = `https://example.com::not a card`;
      expect(guessMarkdownCards(md)).toBeNull();
    });

    it('does not split a line on a :: inside an Anki cloze marker', () => {
      const md = `The {{c1::mitochondrion}} is the powerhouse of the cell`;
      expect(guessMarkdownCards(md)).toBeNull();
    });

    it('keeps real :: pairs while ignoring cloze-only lines', () => {
      const md = `Photosynthesis::Process by which plants convert light\nThe {{c1::nucleus}} stores DNA`;
      const result = guessMarkdownCards(md);
      expect(result).not.toBeNull();
      expect(result!.formatDetected).toBe('inline-double-colon');
      expect(result!.notes).toHaveLength(1);
      expect(result!.notes[0].name).toContain('Photosynthesis');
    });
  });

  describe('priority order', () => {
    it('prefers details-summary over heading-body when both present', () => {
      const md = `## Heading\n\nBody text\n\n<details>\n<summary>Q</summary>\nA\n</details>`;
      const result = guessMarkdownCards(md);
      expect(result!.formatDetected).toBe('details-summary');
    });

    it('prefers heading-body over qa-labels when both present', () => {
      const md = `## Question\n\nAnswer\n\nQ: Another\nA: One`;
      const result = guessMarkdownCards(md);
      expect(result!.formatDetected).toBe('heading-body');
    });
  });

  describe('heading-body with embedded GFM table', () => {
    it('renders a table rather than pipe text when back contains a GFM table', () => {
      const md = [
        '## Causes of neonatal jaundice',
        '',
        '- **Galactosaemia** and other inborn errors of metabolism',
        '| Category | Cause | Mechanism / Explanation |',
        '| --- | --- | --- |',
        '| Increased Production of Bilirubin | Haemolytic disease | Excessive breakdown |',
      ].join('\n');

      const result = guessMarkdownCards(md);
      expect(result).not.toBeNull();
      expect(result!.formatDetected).toBe('heading-body');
      expect(result!.notes).toHaveLength(1);

      const back = result!.notes[0].back;
      expect(back).toContain('<table');
      expect(back).toContain('Haemolytic disease');
      expect(back).not.toContain('| --- | --- |');
    });
  });
});
