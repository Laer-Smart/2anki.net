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

  it('merges consecutive sibling lists into one item run', () => {
    const html = '<ul><li>a</li><li>b</li></ul><ul><li>c</li></ul>';
    expect(extractListItems(html)).toEqual(['a', 'b', 'c']);
  });

  it('merges a fragmented numbered list of single-item ol blocks', () => {
    const html =
      '<div class="page-body">' +
      '<ol class="numbered-list" start="1"><li>Mercury</li></ol>' +
      '<ol class="numbered-list" start="2"><li>Venus</li></ol>' +
      '<ol class="numbered-list" start="3"><li>Earth</li></ol>' +
      '<ol class="numbered-list" start="4"><li>Mars</li></ol>' +
      '<ol class="numbered-list" start="5"><li>Jupiter</li></ol>' +
      '</div>';
    expect(extractListItems(html)).toEqual([
      'Mercury',
      'Venus',
      'Earth',
      'Mars',
      'Jupiter',
    ]);
  });

  it('merges fragmented ol blocks wrapped in display:contents divs', () => {
    const html =
      '<div class="page-body">' +
      '<div style="display:contents"><ol class="numbered-list" start="1"><li>Step one</li></ol></div>' +
      '<div style="display:contents"><ol class="numbered-list" start="2"><li>Step two</li></ol></div>' +
      '<div style="display:contents"><ol class="numbered-list" start="3"><li>Step three</li></ol></div>' +
      '</div>';
    expect(extractListItems(html)).toEqual([
      'Step one',
      'Step two',
      'Step three',
    ]);
  });

  it('does not merge two lists separated by a heading', () => {
    const html =
      '<ul><li>a</li><li>b</li></ul><h2>Other</h2><ul><li>c</li></ul>';
    expect(extractListItems(html)).toEqual(['a', 'b']);
  });

  it('does not merge two lists separated by a paragraph', () => {
    const html = '<ol><li>first</li></ol><p>break</p><ol><li>second</li></ol>';
    expect(extractListItems(html)).toEqual(['first']);
  });
});
