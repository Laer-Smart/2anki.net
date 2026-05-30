import {
  extractHeadingFromSummary,
  extractHeadingMarkup,
} from './extractHeadingFromSummary';

describe('extractHeadingFromSummary', () => {
  it('returns the h3 markup when the details summary wraps an h3', () => {
    const detailsInner =
      '<summary><h3>Key point</h3></summary><div>body</div>';
    expect(extractHeadingFromSummary(detailsInner)).toBe('<h3>Key point</h3>');
  });

  it('returns the h2 markup when the details summary wraps an h2', () => {
    const detailsInner = '<summary><h2>Topic</h2></summary><p>body</p>';
    expect(extractHeadingFromSummary(detailsInner)).toBe('<h2>Topic</h2>');
  });

  it('returns empty string when the summary has no heading element', () => {
    const detailsInner =
      '<summary>just plain question?</summary><p>answer</p>';
    expect(extractHeadingFromSummary(detailsInner)).toBe('');
  });

  it('returns empty string when there is no summary at all', () => {
    expect(extractHeadingFromSummary('<p>body only</p>')).toBe('');
  });

  it('preserves heading attributes (id, class) on the recovered tag', () => {
    const detailsInner =
      '<summary><h3 id="k1" class="">Key</h3></summary><div>x</div>';
    expect(extractHeadingFromSummary(detailsInner)).toBe(
      '<h3 id="k1" class="">Key</h3>'
    );
  });
});

describe('extractHeadingMarkup', () => {
  it('finds and returns the heading inside a summary inner HTML', () => {
    expect(extractHeadingMarkup('<h3>Hello</h3>')).toBe('<h3>Hello</h3>');
  });

  it('returns empty string when there is no heading', () => {
    expect(extractHeadingMarkup('plain summary text')).toBe('');
  });
});
