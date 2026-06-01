import extractTextLines from './extractTextLines';

const displayContentsLine = (text: string) =>
  `<div style="display:contents" dir="auto"><p class="">${text}</p></div>`;

describe('extractTextLines', () => {
  it('pulls every non-empty line from display:contents-wrapped paragraphs', () => {
    const html = [
      displayContentsLine('Roses are red'),
      displayContentsLine('Violets are blue'),
      displayContentsLine('Sugar is sweet'),
    ].join('');

    expect(extractTextLines(html)).toEqual([
      'Roses are red',
      'Violets are blue',
      'Sugar is sweet',
    ]);
  });

  it('drops empty verse-break paragraphs', () => {
    const html = [
      displayContentsLine('First line'),
      '<div style="display:contents" dir="auto"><p class=""></p></div>',
      displayContentsLine('Second line'),
    ].join('');

    expect(extractTextLines(html)).toEqual(['First line', 'Second line']);
  });

  it('reads bare paragraphs and blockquotes too', () => {
    const html = '<p>Bare line</p><blockquote>Quoted line</blockquote>';

    expect(extractTextLines(html)).toEqual(['Bare line', 'Quoted line']);
  });

  it('returns an empty array when no paragraph structure is present', () => {
    expect(extractTextLines('<ul><li>One</li><li>Two</li></ul>')).toEqual([]);
  });

  it('returns an empty array for blank input', () => {
    expect(extractTextLines('')).toEqual([]);
    expect(extractTextLines('   ')).toEqual([]);
  });
});
