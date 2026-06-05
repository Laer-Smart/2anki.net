import replaceAll from './replaceAll';

describe('replaceAll', () => {
  it('replaces every occurrence of a plain string', () => {
    expect(replaceAll('a-b-c', '-', '+')).toBe('a+b+c');
  });

  it('escapes regex metacharacters in the search value', () => {
    expect(replaceAll('a(b)c', '(b)', 'X')).toBe('aXc');
  });

  it('does not treat a pipe in the search value as alternation', () => {
    expect(
      replaceAll('<code>x|y</code>', '<code>x|y</code>', '{{c1::x|y}}')
    ).toBe('{{c1::x|y}}');
  });

  it('does not split on pipes when other text matches the right side', () => {
    expect(replaceAll('foo|bar baz bar', 'foo|bar', 'Z')).toBe('Z baz bar');
  });
});
