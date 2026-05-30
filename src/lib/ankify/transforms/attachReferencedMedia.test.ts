import { attachReferencedMedia } from './attachReferencedMedia';
import { TransformedNote } from './types';

function makeNote(fields: string[], media?: string[]): TransformedNote {
  return {
    guid: 'g',
    modelKind: 'basic',
    modelName: 'Basic',
    fields,
    fieldNames: ['Front', 'Back'],
    tags: [],
    media,
  };
}

describe('attachReferencedMedia', () => {
  it('returns notes unchanged when no media is known', () => {
    const note = makeNote(['<img src="Chugoku.png">', 'back']);
    const out = attachReferencedMedia([note], new Set());
    expect(out[0].media).toBeUndefined();
  });

  it('attaches a referenced source-deck image to the note media', () => {
    const note = makeNote(['<img src="Chugoku.png">', 'back']);
    const known = new Set(['Chugoku.png']);

    const [out] = attachReferencedMedia([note], known);

    expect(out.media).toEqual(['Chugoku.png']);
  });

  it('ignores image references that are not present in the known set', () => {
    const note = makeNote(['<img src="missing.png">', 'back']);
    const known = new Set(['Chugoku.png']);

    const [out] = attachReferencedMedia([note], known);

    expect(out.media).toBeUndefined();
  });

  it('keeps existing fetched media and merges referenced filenames without duplicates', () => {
    const note = makeNote(
      ['<img src="Chugoku.png">', '<img src="2anki-abc.jpg">'],
      ['2anki-abc.jpg']
    );
    const known = new Set(['Chugoku.png', '2anki-abc.jpg']);

    const [out] = attachReferencedMedia([note], known);

    expect(out.media?.sort()).toEqual(['2anki-abc.jpg', 'Chugoku.png']);
  });

  it('collects multiple image references across multiple fields', () => {
    const note = makeNote([
      '<img src="a.png">',
      'text <img src="b.png"> more <img src="c.png">',
    ]);
    const known = new Set(['a.png', 'b.png', 'c.png']);

    const [out] = attachReferencedMedia([note], known);

    expect(out.media?.sort()).toEqual(['a.png', 'b.png', 'c.png']);
  });

  it('handles single-quoted src and uppercase attributes', () => {
    const note = makeNote([
      "<IMG SRC='Capital.png'>",
      '<img  SRC = "Other.png">',
    ]);
    const known = new Set(['Capital.png', 'Other.png']);

    const [out] = attachReferencedMedia([note], known);

    expect(out.media?.sort()).toEqual(['Capital.png', 'Other.png']);
  });
});
