import Note from './Note';

describe('Note', () => {
  test('refresh emoji', () => {
    const note = new Note('🔄This is the back', 'this is the front');
    expect(note.hasRefreshIcon()).toBe(true);
  });
  test('reverse strips the refresh marker from the reversed front', () => {
    const note = new Note('this is the back', '🔄this is the front');
    expect(note.reversed(note).name).toBe('this is the front');
  });
  test('reversed number sorts after source card', () => {
    const note = new Note('this is the back', '🔄this is the front');
    note.number = 4;
    expect(note.reversed(note).number).toBe(4.5);
  });
  test('refresh card yields a marker-free forward note and reversed note', () => {
    const note = new Note('🔄the front', 'the back');
    expect(note.hasRefreshIcon()).toBe(true);

    const reversed = note.reversed(note);
    note.stripRefreshIcon();

    expect(note.name).toBe('the front');
    expect(note.back).toBe('the back');
    expect(reversed.name).toBe('the back');
    expect(reversed.back).toBe('the front');

    for (const face of [note.name, note.back, reversed.name, reversed.back]) {
      expect(face).not.toContain('🔄');
      expect(face).not.toContain('&#x1F504');
    }
  });
  test('refresh marker in HTML-entity form is stripped from both faces', () => {
    const note = new Note('&#x1F504; the front', 'the back');
    expect(note.hasRefreshIcon()).toBe(true);

    const reversed = note.reversed(note);
    note.stripRefreshIcon();

    expect(note.name).toBe('the front');
    expect(reversed.back).toBe('the front');
    expect(note.name).not.toContain('&#x1F504');
    expect(reversed.back).not.toContain('&#x1F504');
  });
});
