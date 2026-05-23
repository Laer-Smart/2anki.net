import { splitByHeadings } from './splitByHeadings';
import type { Heading } from './types';

const SHORT_BODY_THRESHOLD = 80;

function h(text: string, level: Heading['level'], body: string): Heading {
  return { text, level, body };
}

describe('splitByHeadings', () => {
  it('produces chunks for a single heading with a long body', () => {
    const headings: Heading[] = [
      h('Polarised lenses', 1, 'Light passing through a polarised lens is filtered horizontally. It reduces glare from reflective surfaces. The lens material contains a special polymer. The polymer absorbs horizontal light waves selectively.'),
    ];
    const result = splitByHeadings(headings);
    expect(result).toHaveLength(1);
    expect(result[0].anchor).toBe('Polarised lenses');
    expect(result[0].bodyChunk).toContain('filtered horizontally');
  });

  it('produces one chunk per heading for multiple flat headings', () => {
    const headings: Heading[] = [
      h('Chapter 1', 1, 'First chapter has some content about topic A. More detail about topic A follows here.'),
      h('Chapter 2', 1, 'Second chapter covers topic B in detail. Even more about topic B.'),
      h('Chapter 3', 1, 'Third chapter introduces topic C. Topic C is fascinating.'),
    ];
    const result = splitByHeadings(headings);
    expect(result).toHaveLength(3);
    expect(result[0].anchor).toBe('Chapter 1');
    expect(result[1].anchor).toBe('Chapter 2');
    expect(result[2].anchor).toBe('Chapter 3');
  });

  it('emits a single chunk for a body under the short-body threshold', () => {
    const shortBody = 'Short body text.';
    expect(shortBody.length).toBeLessThan(SHORT_BODY_THRESHOLD);
    const headings: Heading[] = [
      h('Brief section', 1, shortBody),
    ];
    const result = splitByHeadings(headings);
    expect(result).toHaveLength(1);
    expect(result[0].bodyChunk).toBe(shortBody);
  });

  it('flattens nested headings — uses the deepest level present', () => {
    const headings: Heading[] = [
      h('Parent', 1, ''),
      h('Child A', 2, 'Child A body has enough text to be meaningful.'),
      h('Child B', 2, 'Child B body has enough text to be meaningful.'),
    ];
    const result = splitByHeadings(headings);
    const anchors = result.map((c) => c.anchor);
    expect(anchors).not.toContain('Parent');
    expect(anchors).toContain('Child A');
    expect(anchors).toContain('Child B');
  });

  it('returns [] when passed an empty headings array', () => {
    expect(splitByHeadings([])).toEqual([]);
  });

  it('keeps the anchor text plain — no HTML or markdown leaking in', () => {
    const headings: Heading[] = [
      h('<em>Italic heading</em>', 1, 'Some body text here for the test case.'),
    ];
    const result = splitByHeadings(headings);
    expect(result[0].anchor).not.toContain('<em>');
  });

  it('skips headings with empty body (parent heading in nested scenario)', () => {
    const headings: Heading[] = [
      h('Parent heading', 1, ''),
      h('Child heading', 2, 'This child has a real body with meaningful content.'),
    ];
    const result = splitByHeadings(headings);
    expect(result.every((c) => c.bodyChunk.trim().length > 0)).toBe(true);
  });
});
