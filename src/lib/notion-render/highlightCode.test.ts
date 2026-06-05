import { highlightCode } from './highlightCode';

describe('highlightCode', () => {
  it('emits hljs token spans for a known registered language', () => {
    const out = highlightCode('const x = 1;', 'javascript');
    expect(out).toContain('<span class="hljs-keyword">const</span>');
    expect(out).toContain('hljs-number');
  });

  it('escapes plaintext safely when the language is unknown', () => {
    const out = highlightCode(
      '<script>alert(1)</script>',
      'totally-not-a-language'
    );
    expect(out).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('escapes plaintext safely when no language is given', () => {
    const out = highlightCode('a < b && c > d');
    expect(out).toBe('a &lt; b &amp;&amp; c &gt; d');
  });

  it('treats plaintext language as plain escaped text', () => {
    const out = highlightCode('<b>raw</b>', 'plaintext');
    expect(out).toBe('&lt;b&gt;raw&lt;/b&gt;');
  });

  it('does not double-escape highlighted output', () => {
    const out = highlightCode('const s = "<a>";', 'javascript');
    expect(out).not.toContain('&amp;lt;');
    expect(out).toContain('&lt;a&gt;');
  });
});
