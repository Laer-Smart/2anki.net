import hasInlineClozeCode from './hasInlineClozeCode';

test('detects an inline code element as a cloze marker', () => {
  expect(hasInlineClozeCode('<p>The capital is <code>Canberra</code>.</p>')).toBe(
    true
  );
});

test('ignores a fenced code block', () => {
  expect(
    hasInlineClozeCode('<pre class="code"><code>def foo():\n  return 1</code></pre>')
  ).toBe(false);
});

test('detects an inline code marker alongside a code block', () => {
  const html =
    '<pre class="code"><code>def foo()</code></pre><p>Answer: <code>bar</code></p>';
  expect(hasInlineClozeCode(html)).toBe(true);
});

test('detects inline code inside a table cell', () => {
  const html =
    '<table><tbody><tr><td>Symbol</td><td><code>H</code></td></tr></tbody></table>';
  expect(hasInlineClozeCode(html)).toBe(true);
});

test('returns false when there is no code element', () => {
  expect(hasInlineClozeCode('<p>Plain content with no markers</p>')).toBe(false);
});
