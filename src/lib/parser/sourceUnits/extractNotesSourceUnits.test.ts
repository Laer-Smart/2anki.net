import { extractNotesSourceUnits } from './extractNotesSourceUnits';

describe('extractNotesSourceUnits', () => {
  it('emits one unit per heading section in markdown', () => {
    const md = `# Introduction\n\nSome body text.\n\n## Key Concepts\n\nBullet one.\nBullet two.\n`;

    const units = extractNotesSourceUnits(md, 'md');

    expect(units).toHaveLength(2);
    expect(units[0]).toMatchObject({
      id: 'section-1',
      role: 'body',
      visibleText: 'Introduction\n\nSome body text.',
      speakerNotes: '',
    });
    expect(units[1]).toMatchObject({
      id: 'section-2',
      role: 'body',
      visibleText: 'Key Concepts\n\nBullet one.\nBullet two.',
      speakerNotes: '',
    });
  });

  it('returns a single unit for text with no headings', () => {
    const text = 'Just a paragraph of notes with no headings at all.';

    const units = extractNotesSourceUnits(text, 'md');

    expect(units).toHaveLength(1);
    expect(units[0]).toMatchObject({
      id: 'section-1',
      role: 'body',
      visibleText: text,
      speakerNotes: '',
    });
  });

  it('returns empty array for blank input', () => {
    const units = extractNotesSourceUnits('   ', 'md');

    expect(units).toEqual([]);
  });

  it('emits one unit per h1/h2 section in HTML', () => {
    const html = `<h1>Chapter 1</h1><p>Intro.</p><h2>Section 1.1</h2><p>Details.</p>`;

    const units = extractNotesSourceUnits(html, 'html');

    expect(units).toHaveLength(2);
    expect(units[0].id).toBe('section-1');
    expect(units[0].visibleText).toContain('Chapter 1');
    expect(units[1].id).toBe('section-2');
    expect(units[1].visibleText).toContain('Section 1.1');
  });

  it('strips HTML tags from visible text in HTML input', () => {
    const html = `<h1>Topic</h1><p>Some <strong>bold</strong> text.</p>`;

    const units = extractNotesSourceUnits(html, 'html');

    expect(units[0].visibleText).not.toContain('<strong>');
    expect(units[0].visibleText).toContain('bold');
  });

  it('assigns sequential IDs section-1, section-2, section-3', () => {
    const md = `# A\n\ntext\n\n# B\n\ntext\n\n# C\n\ntext`;

    const units = extractNotesSourceUnits(md, 'md');

    expect(units.map((u) => u.id)).toEqual(['section-1', 'section-2', 'section-3']);
  });
});
