import { markdownToHTML } from './markdown';

describe('markdownToHTML', () => {
  describe('basic inline formatting', () => {
    it('renders bold text as strong', () => {
      const result = markdownToHTML('**Galactosaemia** and other text');
      expect(result).toContain('<strong>Galactosaemia</strong>');
      expect(result).toContain('and other text');
    });

    it('renders a plain paragraph', () => {
      const result = markdownToHTML('Simple paragraph here');
      expect(result).toContain('Simple paragraph here');
    });

    it('renders inline code', () => {
      const result = markdownToHTML('Use `markdownToHTML` function');
      expect(result).toContain('<code>markdownToHTML</code>');
    });
  });

  describe('simple line breaks', () => {
    it('converts bare newlines to br tags', () => {
      const result = markdownToHTML('Line one\nLine two');
      expect(result).toContain('<br');
      expect(result).toContain('Line one');
      expect(result).toContain('Line two');
    });
  });

  describe('headings', () => {
    it('renders a heading', () => {
      const result = markdownToHTML('## Section heading');
      expect(result).toContain('<h2>');
      expect(result).toContain('Section heading');
    });
  });

  describe('nested bullets', () => {
    it('renders nested list items', () => {
      const result = markdownToHTML('- Parent item\n  - Child item');
      expect(result).toContain('<ul>');
      expect(result).toContain('Parent item');
      expect(result).toContain('Child item');
    });
  });

  describe('task lists (MCQ compatibility)', () => {
    it('renders task list with checkbox inputs', () => {
      const result = markdownToHTML(
        '- [x] Correct answer\n- [ ] Wrong one\n- [ ] Also wrong'
      );
      expect(result).toContain('input');
      expect(result).toContain('type="checkbox"');
      expect(result).toContain('Correct answer');
      expect(result).toContain('Wrong one');
    });

    it('marks checked item with checked attribute', () => {
      const result = markdownToHTML(
        '- [x] Correct answer\n- [ ] Wrong one\n- [ ] Also wrong'
      );
      expect(result).toMatch(/checked/);
    });
  });

  describe('U+00A0 non-breaking space', () => {
    it('passes through content containing U+00A0 without double-escaping', () => {
      const input = 'Hello world';
      const result = markdownToHTML(input);
      expect(result).not.toContain('&amp;nbsp;');
      expect(result).toContain('world');
    });
  });

  describe('trimWhitespace option', () => {
    it('trims leading and trailing whitespace when flag is true', () => {
      const result = markdownToHTML('  hello  ', true);
      expect(result).toContain('hello');
    });
  });

  describe('Notion callout <aside> wrapper (regression: #2529)', () => {
    it('strips opening <aside> tag from rendered HTML', () => {
      const input =
        '<aside>\n🩺 Jaundice is abnormal when:\n\n- It occurs within 24 hours of birth\n</aside>';
      const html = markdownToHTML(input);
      expect(html).not.toContain('&lt;aside');
      expect(html).not.toContain('&lt;/aside');
      expect(html).not.toContain('<aside');
      expect(html).not.toContain('</aside>');
    });

    it('preserves callout content after stripping <aside> wrapper', () => {
      const input =
        '<aside>\n🩺 Jaundice is abnormal when:\n\n- It occurs within 24 hours of birth\n</aside>';
      const html = markdownToHTML(input);
      expect(html).toContain('Jaundice is abnormal');
    });

    it('preserves bullet list inside a callout block', () => {
      const input =
        '<aside>\n🩺 Jaundice is abnormal when:\n\n- It occurs within 24 hours of birth\n</aside>';
      const html = markdownToHTML(input);
      expect(html).toContain('<ul>');
      expect(html).toContain('24 hours');
    });
  });

  describe('GFM table in bullet item (regression: user 10781)', () => {
    const galactosaemia = [
      '- **Galactosaemia** and other inborn errors of metabolism',
      '| Category | Cause | Mechanism / Explanation |',
      '| --- | --- | --- |',
      '| Increased Production of Bilirubin | Haemolytic disease | Excessive breakdown |',
    ].join('\n');

    it('renders a table element (not pipe text)', () => {
      const result = markdownToHTML(galactosaemia);
      expect(result).toContain('<table');
    });

    it('includes a thead with the correct column headers', () => {
      const result = markdownToHTML(galactosaemia);
      expect(result).toContain('<thead');
      expect(result).toContain('Category');
      expect(result).toContain('Cause');
      expect(result).toContain('Mechanism / Explanation');
    });

    it('includes at least one data row in tbody', () => {
      const result = markdownToHTML(galactosaemia);
      expect(result).toContain('<tbody');
      expect(result).toContain('Haemolytic disease');
      expect(result).toContain('Excessive breakdown');
    });

    it('preserves the bold text in the bullet', () => {
      const result = markdownToHTML(galactosaemia);
      expect(result).toContain('<strong>Galactosaemia</strong>');
    });

    it('does not leak raw pipe characters as text', () => {
      const result = markdownToHTML(galactosaemia);
      expect(result).not.toContain('| --- | --- |');
    });
  });
});
