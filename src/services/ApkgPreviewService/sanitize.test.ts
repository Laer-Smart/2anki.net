import { sanitizeCardHtml, sanitizeCss } from './sanitize';

describe('sanitizeCardHtml', () => {
  it('preserves mark tags with highlight-yellow_background class', () => {
    const html =
      '<p><mark class="highlight-yellow_background">yellow highlighted</mark></p>';
    expect(sanitizeCardHtml(html)).toBe(html);
  });

  it('preserves hljs token spans on highlighted code', () => {
    const html =
      '<pre><code class="hljs language-javascript"><span class="hljs-keyword">const</span> x = 1;</code></pre>';
    expect(sanitizeCardHtml(html)).toBe(html);
  });

  it('preserves mark tags with highlight-red_background class', () => {
    const html =
      '<p><mark class="highlight-red_background">red highlighted</mark></p>';
    expect(sanitizeCardHtml(html)).toBe(html);
  });

  it('preserves mark tags with inline background style', () => {
    const input =
      '<p><mark style="background: rgb(251,243,219)">styled highlight</mark></p>';
    const result = sanitizeCardHtml(input);
    expect(result).toContain('<mark');
    expect(result).toContain('background');
    expect(result).toContain('styled highlight</mark>');
  });

  it('preserves multiple highlight colors in the same card', () => {
    const html =
      '<p><mark class="highlight-yellow_background">yellow</mark> and <mark class="highlight-blue_background">blue</mark></p>';
    expect(sanitizeCardHtml(html)).toBe(html);
  });

  it('strips script tags', () => {
    expect(sanitizeCardHtml('<script>alert(1)</script>')).toBe('');
  });

  it('preserves basic formatting tags', () => {
    const html = '<p><strong>bold</strong> and <em>italic</em></p>';
    expect(sanitizeCardHtml(html)).toBe(html);
  });
});

describe('sanitizeCss', () => {
  it('strips @import rules', () => {
    expect(sanitizeCss('@import url("evil.css");')).toBe('');
  });

  it('strips javascript: in expressions', () => {
    expect(sanitizeCss('expression(alert(1))')).toBe('alert(1))');
  });

  it('preserves highlight class definitions', () => {
    const css =
      '.highlight-yellow_background { background: rgb(251,243,219); }';
    expect(sanitizeCss(css)).toBe(css);
  });
});
