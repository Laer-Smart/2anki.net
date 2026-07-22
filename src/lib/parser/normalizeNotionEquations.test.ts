import * as cheerio from 'cheerio';

import { normalizeNotionEquations } from './normalizeNotionEquations';

const INLINE_EQUATION = `<p>Euler: <span class="notion-text-equation-token" contenteditable="false">
  <span class="katex">
    <span class="katex-mathml">
      <math xmlns="http://www.w3.org/1998/Math/MathML">
        <semantics>
          <mrow><msup><mi>e</mi><mrow><mi>i</mi><mi>π</mi></mrow></msup></mrow>
          <annotation encoding="application/x-tex">e^{i\\pi} = -1</annotation>
        </semantics>
      </math>
    </span>
    <span class="katex-html" aria-hidden="true"><span class="base">e</span></span>
  </span>
</span> is neat.</p>`;

const BLOCK_EQUATION = `<figure class="equation">
  <div contenteditable="false">
    <span class="katex-display">
      <span class="katex">
        <span class="katex-mathml">
          <math xmlns="http://www.w3.org/1998/Math/MathML">
            <semantics>
              <mrow><mo>&#x222B;</mo></mrow>
              <annotation encoding="application/x-tex">\\int_0^1 x^2\\,dx = \\frac{1}{3}</annotation>
            </semantics>
          </math>
        </span>
        <span class="katex-html" aria-hidden="true"><span class="base">i</span></span>
      </span>
    </span>
  </div>
</figure>`;

const INLINE_LESS_THAN = `<p><span class="notion-text-equation-token">
  <span class="katex"><span class="katex-mathml"><math><semantics><mrow></mrow>
  <annotation encoding="application/x-tex">a &lt; b</annotation></semantics></math></span></span>
</span></p>`;

const MISSING_ANNOTATION = `<p>See <span class="notion-text-equation-token">
  <span class="katex"><span class="katex-html">x squared</span></span>
</span> here.</p>`;

describe('normalizeNotionEquations', () => {
  it('converts an inline equation to Anki inline math delimiters', () => {
    const dom = cheerio.load(INLINE_EQUATION);

    normalizeNotionEquations(dom);
    const html = dom.html();

    expect(html).toContain('\\(e^{i\\pi} = -1\\)');
    expect(html).not.toContain('notion-text-equation-token');
    expect(html).not.toContain('class="katex"');
    expect(html).not.toContain('annotation');
  });

  it('converts a block equation to Anki display math delimiters', () => {
    const dom = cheerio.load(BLOCK_EQUATION);

    normalizeNotionEquations(dom);
    const html = dom.html();

    expect(html).toContain('\\[\\int_0^1 x^2\\,dx = \\frac{1}{3}\\]');
    expect(html).not.toContain('\\(\\int');
    expect(html).not.toContain('class="equation"');
    expect(html).not.toContain('katex-display');
  });

  it('escapes HTML-special characters in the extracted LaTeX', () => {
    const dom = cheerio.load(INLINE_LESS_THAN);

    normalizeNotionEquations(dom);

    expect(dom.html()).toContain('\\(a &lt; b\\)');
  });

  it('degrades a missing annotation to plain text without throwing or broken markup', () => {
    const dom = cheerio.load(MISSING_ANNOTATION);

    expect(() => normalizeNotionEquations(dom)).not.toThrow();
    const html = dom.html();

    expect(html).toContain('x squared');
    expect(html).not.toContain('\\(\\)');
    expect(html).not.toContain('notion-text-equation-token');
    expect(html).not.toContain('class="katex"');
  });
});
