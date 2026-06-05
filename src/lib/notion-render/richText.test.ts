import { renderPlainText, renderRichText } from './richText';

describe('renderRichText', () => {
  it('returns empty string for nullish or empty input', () => {
    expect(renderRichText(undefined)).toBe('');
    expect(renderRichText([])).toBe('');
  });

  it('escapes html-special characters in plain_text', () => {
    expect(renderRichText([{ plain_text: '<script>&"' }])).toBe(
      '&lt;script&gt;&amp;&quot;'
    );
  });

  it('wraps annotated text — bold + italic + code + strike + underline', () => {
    expect(
      renderRichText([
        {
          plain_text: 'hi',
          annotations: {
            bold: true,
            italic: true,
            code: true,
            strikethrough: true,
            underline: true,
          },
        },
      ])
    ).toBe('<u><del><em><strong><code>hi</code></strong></em></del></u>');
  });

  it('renders an anchor tag when href is present', () => {
    expect(
      renderRichText([
        { plain_text: 'click', href: 'https://example.com/?x=1&y=2' },
      ])
    ).toBe('<a href="https://example.com/?x=1&amp;y=2">click</a>');
  });

  it('renders inline LaTeX for equation items', () => {
    expect(
      renderRichText([{ type: 'equation', equation: { expression: 'a < b' } }])
    ).toBe('\\(a &lt; b\\)');
  });
});

describe('renderPlainText', () => {
  it('joins plain_text without escaping or annotations', () => {
    expect(
      renderPlainText([
        { plain_text: 'a', annotations: { bold: true } },
        { plain_text: '<b>' },
      ])
    ).toBe('a<b>');
  });

  it('returns empty string for nullish input', () => {
    expect(renderPlainText(undefined)).toBe('');
  });
});
