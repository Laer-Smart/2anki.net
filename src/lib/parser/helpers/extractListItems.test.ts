import extractListItems from './extractListItems';

describe('extractListItems', () => {
  it('returns the text of each li in a bulleted list', () => {
    const html =
      '<ul class="bulleted-list"><li>I pledge allegiance</li><li>to the flag</li></ul>';
    expect(extractListItems(html)).toEqual([
      'I pledge allegiance',
      'to the flag',
    ]);
  });

  it('reads an ordered list', () => {
    const html = '<ol><li>First</li><li>Second</li><li>Third</li></ol>';
    expect(extractListItems(html)).toEqual(['First', 'Second', 'Third']);
  });

  it('returns inner HTML so formatting survives', () => {
    const html = '<ul><li><strong>bold</strong> line</li><li>plain</li></ul>';
    expect(extractListItems(html)).toEqual([
      '<strong>bold</strong> line',
      'plain',
    ]);
  });

  it('only reads top-level items, not nested sublists', () => {
    const html =
      '<ul><li>parent<ul><li>child</li></ul></li><li>sibling</li></ul>';
    const items = extractListItems(html);
    expect(items).toHaveLength(2);
    expect(items[1]).toBe('sibling');
  });

  it('returns an empty array when there is no list', () => {
    expect(extractListItems('<p>just a paragraph</p>')).toEqual([]);
  });

  it('returns an empty array for an empty string', () => {
    expect(extractListItems('')).toEqual([]);
  });

  it('reads the first list only when several are present', () => {
    const html = '<ul><li>a</li><li>b</li></ul><ul><li>c</li></ul>';
    expect(extractListItems(html)).toEqual(['a', 'b']);
  });
});
