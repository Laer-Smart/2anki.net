import { renderDeckMarkdownTable } from './renderDeckMarkdownTable';

describe('renderDeckMarkdownTable', () => {
  it('renders a simple two-column table', () => {
    const text = renderDeckMarkdownTable({
      headerLines: ['**JLPT N5** — 2 cards'],
      cards: [
        { front: 'water', back: '水' },
        { front: 'fire', back: '火' },
      ],
    });

    expect(text).toBe(
      [
        '**JLPT N5** — 2 cards',
        '',
        '| # | Front | Back |',
        '|--:|-------|------|',
        '| 1 | water | 水 |',
        '| 2 | fire | 火 |',
      ].join('\n')
    );
  });

  it('adds a direction column when any card carries a direction', () => {
    const text = renderDeckMarkdownTable({
      headerLines: ['**Days** — 2 cards'],
      cards: [
        { front: 'Monday', back: '月曜日', direction: 'forward' },
        { front: '火曜日', back: 'Tuesday', direction: 'reverse' },
      ],
    });

    expect(text).toContain('| # | Dir | Front | Back |');
    expect(text).toContain('| 1 | → | Monday | 月曜日 |');
    expect(text).toContain('| 2 | ← | 火曜日 | Tuesday |');
  });

  it('escapes pipe characters and flattens newlines in cell text', () => {
    const text = renderDeckMarkdownTable({
      headerLines: ['**Deck** — 1 card'],
      cards: [{ front: 'A | B\nC', back: 'D | E' }],
    });

    expect(text).toContain('| 1 | A \\| B C | D \\| E |');
  });

  it('truncates to maxRows and appends a default truncation note', () => {
    const text = renderDeckMarkdownTable({
      headerLines: ['**Deck** — 34 cards'],
      cards: Array.from({ length: 34 }, (_, i) => ({
        front: `f${i}`,
        back: `b${i}`,
      })),
      maxRows: 5,
    });

    expect(text.match(/^\| \d+ \|/gm)).toHaveLength(5);
    expect(text).toContain(
      '_Showing 5 of 34. Ask for the full preview to see more._'
    );
  });

  it('uses a provided note instead of the default truncation note', () => {
    const text = renderDeckMarkdownTable({
      headerLines: ['**Deck** — 100 cards'],
      cards: [{ front: 'a', back: 'b' }],
      note: 'Showing cards 1–20 of 100. Pass page (0-based) and pageSize for more.',
    });

    expect(text).toContain(
      '_Showing cards 1–20 of 100. Pass page (0-based) and pageSize for more._'
    );
  });

  it('renders only header lines when there are no cards', () => {
    const text = renderDeckMarkdownTable({
      headerLines: ['**Empty deck** — 0 cards'],
      cards: [],
    });

    expect(text).toBe('**Empty deck** — 0 cards');
  });
});
