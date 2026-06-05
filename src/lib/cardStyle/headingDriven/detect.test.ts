import { detect } from './detect';
import type { Heading } from './types';

describe('detect — markdown', () => {
  it('returns headings with body slices for a simple markdown document', () => {
    const source = `# Polarised lenses

Light passing through a polarised lens is filtered horizontally.
It reduces glare from reflective surfaces.

## How they work

The lens contains a special polymer that absorbs horizontal light waves.
`;
    const result = detect('markdown', source);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject<Partial<Heading>>({
      text: 'Polarised lenses',
      level: 1,
    });
    expect(result[0].body).toContain('Light passing through');
    expect(result[1]).toMatchObject<Partial<Heading>>({
      text: 'How they work',
      level: 2,
    });
    expect(result[1].body).toContain('special polymer');
  });

  it('returns [] for a markdown document with no headings', () => {
    const source =
      'Just some plain text with no headings at all.\nAnother line here.';
    expect(detect('markdown', source)).toEqual([]);
  });

  it('strips inline markdown formatting from heading text', () => {
    const source = '## **Bold heading** and _italic_\n\nBody text here.\n';
    const result = detect('markdown', source);
    expect(result).toHaveLength(1);
    expect(result[0].text).not.toContain('**');
    expect(result[0].text).not.toContain('_');
    expect(result[0].text).toBe('Bold heading and italic');
  });

  it('collects body lines until the next heading of equal or shallower depth', () => {
    const source = `# Chapter 1

First chapter body line.
Second line of body.

# Chapter 2

Second chapter body.
`;
    const result = detect('markdown', source);
    expect(result).toHaveLength(2);
    expect(result[0].body).toContain('First chapter body line');
    expect(result[0].body).not.toContain('Second chapter body');
  });
});

describe('detect — html', () => {
  it('returns headings with body slices for an HTML document', () => {
    const source = `<h1>Enzymes</h1>
<p>An enzyme is a biological catalyst.</p>
<p>They lower activation energy.</p>
<h2>Michaelis-Menten Kinetics</h2>
<p>Describes the rate of enzymatic reactions.</p>`;
    const result = detect('html', source);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject<Partial<Heading>>({
      text: 'Enzymes',
      level: 1,
    });
    expect(result[0].body).toContain('biological catalyst');
    expect(result[1]).toMatchObject<Partial<Heading>>({
      text: 'Michaelis-Menten Kinetics',
      level: 2,
    });
  });

  it('returns [] for HTML with no heading tags', () => {
    const source = '<p>No headings here.</p><p>Just paragraphs.</p>';
    expect(detect('html', source)).toEqual([]);
  });

  it('strips HTML tags from heading text', () => {
    const source = '<h2><em>Italic heading</em></h2><p>Body text.</p>';
    const result = detect('html', source);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('Italic heading');
    expect(result[0].text).not.toContain('<em>');
  });
});

describe('detect — notion-html', () => {
  it('returns headings from Notion-exported HTML with heading_1/heading_2 structure', () => {
    const source = `<h1 class="notion-heading-1">Cell Biology</h1>
<p>Cells are the basic unit of life.</p>
<h2 class="notion-heading-2">Organelles</h2>
<p>Organelles are specialized structures within cells.</p>`;
    const result = detect('notion-html', source);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject<Partial<Heading>>({
      text: 'Cell Biology',
      level: 1,
    });
    expect(result[1]).toMatchObject<Partial<Heading>>({
      text: 'Organelles',
      level: 2,
    });
  });

  it('returns [] for Notion HTML with no heading elements', () => {
    const source = '<p class="notion-text">Plain text paragraph.</p>';
    expect(detect('notion-html', source)).toEqual([]);
  });
});
