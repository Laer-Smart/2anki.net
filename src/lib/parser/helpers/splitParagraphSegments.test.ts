import splitParagraphSegments, {
  MAX_PARAGRAPH_SEGMENTS,
} from './splitParagraphSegments';

describe('splitParagraphSegments', () => {
  it('splits a multi-sentence paragraph on sentence enders', () => {
    const text = 'Mercury is closest. Venus is hottest. Earth has life.';
    expect(splitParagraphSegments(text)).toEqual([
      'Mercury is closest.',
      'Venus is hottest.',
      'Earth has life.',
    ]);
  });

  it('keeps the punctuation on each sentence including ! and ?', () => {
    const text = 'Run now! Why wait? Just go.';
    expect(splitParagraphSegments(text)).toEqual([
      'Run now!',
      'Why wait?',
      'Just go.',
    ]);
  });

  it('falls back to commas and semicolons when there is one sentence', () => {
    const text =
      'You should not bother others, you should be kind, and otherwise do as you like.';
    expect(splitParagraphSegments(text)).toEqual([
      'You should not bother others',
      'you should be kind',
      'and otherwise do as you like',
    ]);
  });

  it('strips surrounding guillemets and quotes before splitting', () => {
    const text =
      '«One thing happens, another thing follows, a third thing ends it.»';
    expect(splitParagraphSegments(text)).toEqual([
      'One thing happens',
      'another thing follows',
      'a third thing ends it',
    ]);
  });

  it('returns an empty array for a single short clause with no split points', () => {
    expect(splitParagraphSegments('Just one short clause')).toEqual([]);
  });

  it('returns an empty array when only one sentence and no commas', () => {
    expect(splitParagraphSegments('A single complete sentence.')).toEqual([]);
  });

  it('returns an empty array for empty or non-string input', () => {
    expect(splitParagraphSegments('')).toEqual([]);
    expect(splitParagraphSegments('   ')).toEqual([]);
    expect(splitParagraphSegments(null as unknown as string)).toEqual([]);
    expect(splitParagraphSegments(undefined as unknown as string)).toEqual([]);
  });

  it('drops empty segments produced by repeated separators', () => {
    const text = 'First sentence.. Second sentence.';
    expect(splitParagraphSegments(text)).toEqual([
      'First sentence.',
      'Second sentence.',
    ]);
  });

  it('skips overlapping when a paragraph explodes past the cap', () => {
    const sentence = 'Sentence here.';
    const text = Array.from(
      { length: MAX_PARAGRAPH_SEGMENTS + 5 },
      () => sentence
    ).join(' ');
    expect(splitParagraphSegments(text)).toEqual([]);
  });

  it('splits exactly at the cap', () => {
    const text = Array.from(
      { length: MAX_PARAGRAPH_SEGMENTS },
      (_v, i) => `Sentence ${i}.`
    ).join(' ');
    expect(splitParagraphSegments(text)).toHaveLength(MAX_PARAGRAPH_SEGMENTS);
  });
});
