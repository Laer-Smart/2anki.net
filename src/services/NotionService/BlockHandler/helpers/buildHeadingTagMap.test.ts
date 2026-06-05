import { buildHeadingTagMap, HeadingClassifier } from './buildHeadingTagMap';

interface FakeBlock {
  object: 'block';
  id: string;
  type: string;
  heading_1?: { rich_text: { plain_text: string }[]; is_toggleable?: boolean };
  heading_2?: { rich_text: { plain_text: string }[]; is_toggleable?: boolean };
  heading_3?: { rich_text: { plain_text: string }[]; is_toggleable?: boolean };
  heading_4?: { rich_text: { plain_text: string }[]; is_toggleable?: boolean };
}

const heading = (
  id: string,
  type: 'heading_1' | 'heading_2' | 'heading_3' | 'heading_4',
  text: string,
  is_toggleable = false
): FakeBlock => ({
  object: 'block',
  id,
  type,
  [type]: { rich_text: [{ plain_text: text }], is_toggleable },
});

const toggle = (id: string): FakeBlock => ({
  object: 'block',
  id,
  type: 'toggle',
});

const classify: HeadingClassifier = (block) => {
  const fake = block as FakeBlock;
  return (
    fake.type === 'toggle' ||
    fake.heading_1?.is_toggleable === true ||
    fake.heading_2?.is_toggleable === true ||
    fake.heading_3?.is_toggleable === true
  );
};

const build = (blocks: FakeBlock[]) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- fake blocks structurally match the heading fields the helper reads
  buildHeadingTagMap(blocks as any, classify as any);

describe('buildHeadingTagMap', () => {
  it('returns an empty map when there are no headings', () => {
    const map = build([toggle('c1'), toggle('c2')]);
    expect(map.size).toBe(0);
  });

  it('tags a card with the single preceding heading', () => {
    const map = build([heading('h1', 'heading_1', 'Biology'), toggle('c1')]);
    expect(map.get('c1')).toBe('Biology');
  });

  it('builds a nested H1::H2::H3 chain', () => {
    const map = build([
      heading('h1', 'heading_1', 'Biology'),
      heading('h2', 'heading_2', 'Cell division'),
      heading('h3', 'heading_3', 'Mitosis'),
      toggle('c1'),
    ]);
    expect(map.get('c1')).toBe('Biology::Cell-division::Mitosis');
  });

  it('clears deeper levels when a higher heading appears (H1 after H3 clears H2+H3)', () => {
    const map = build([
      heading('h1', 'heading_1', 'Biology'),
      heading('h2', 'heading_2', 'Cell division'),
      heading('h3', 'heading_3', 'Mitosis'),
      toggle('c1'),
      heading('h1b', 'heading_1', 'Chemistry'),
      toggle('c2'),
    ]);
    expect(map.get('c1')).toBe('Biology::Cell-division::Mitosis');
    expect(map.get('c2')).toBe('Chemistry');
  });

  it('keeps H1 and clears H3 when a sibling H2 replaces the current H2', () => {
    const map = build([
      heading('h1', 'heading_1', 'Biology'),
      heading('h2', 'heading_2', 'Cell division'),
      heading('h3', 'heading_3', 'Mitosis'),
      heading('h2b', 'heading_2', 'Respiration'),
      toggle('c1'),
    ]);
    expect(map.get('c1')).toBe('Biology::Respiration');
  });

  it('converts spaces in a heading title to hyphens', () => {
    const map = build([
      heading('h1', 'heading_1', 'Cell division stages'),
      toggle('c1'),
    ]);
    expect(map.get('c1')).toBe('Cell-division-stages');
  });

  it('does not emit empty segments when a heading title contains ::', () => {
    const map = build([heading('h1', 'heading_1', 'A::B'), toggle('c1')]);
    expect(map.get('c1')).not.toContain('::::');
    expect(map.get('c1')).toBe('A::B');
  });

  it('skips empty or whitespace-only heading levels', () => {
    const map = build([
      heading('h1', 'heading_1', 'Biology'),
      heading('h2', 'heading_2', '   '),
      heading('h3', 'heading_3', 'Mitosis'),
      toggle('c1'),
    ]);
    expect(map.get('c1')).toBe('Biology::Mitosis');
  });

  it('tags a toggle-heading card by its ancestors, not itself', () => {
    const map = build([
      heading('h1', 'heading_1', 'Biology'),
      heading('h2', 'heading_2', 'Mitosis', true),
    ]);
    expect(map.get('h2')).toBe('Biology');
  });

  it('ignores heading_4', () => {
    const map = build([
      heading('h1', 'heading_1', 'Biology'),
      heading('h4', 'heading_4', 'Deep'),
      toggle('c1'),
    ]);
    expect(map.get('c1')).toBe('Biology');
  });

  it('does not add an entry for a card with no preceding heading', () => {
    const map = build([
      toggle('c0'),
      heading('h1', 'heading_1', 'Biology'),
      toggle('c1'),
    ]);
    expect(map.has('c0')).toBe(false);
    expect(map.get('c1')).toBe('Biology');
  });
});
