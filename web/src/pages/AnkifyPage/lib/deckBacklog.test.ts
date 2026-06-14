import { describe, expect, test } from 'vitest';

import { formatBacklog, formatMaturity, sumDeckBacklog } from './deckBacklog';
import { AnkifyStatsDeck } from '../stats/types';

const deck = (
  fullName: string,
  partial: Partial<AnkifyStatsDeck> = {}
): AnkifyStatsDeck => {
  const segments = fullName.split('::');
  return {
    fullName,
    name: segments[segments.length - 1],
    depth: segments.length - 1,
    new: 0,
    learning: 0,
    review: 0,
    total: 0,
    ...partial,
  };
};

describe('sumDeckBacklog', () => {
  test('matches the deck itself', () => {
    const backlog = sumDeckBacklog('Notion Sync::A', [
      deck('Notion Sync::A', { review: 5, learning: 2, new: 3 }),
    ]);
    expect(backlog).toEqual({ due: 7, fresh: 3 });
  });

  test('sums the deck and its hierarchy descendants', () => {
    const backlog = sumDeckBacklog('Notion Sync::A', [
      deck('Notion Sync::A', { review: 5, learning: 2, new: 3 }),
      deck('Notion Sync::A::Child', { review: 1, learning: 1, new: 4 }),
    ]);
    expect(backlog).toEqual({ due: 9, fresh: 7 });
  });

  test('ignores a bare prefix that is not a hierarchy boundary', () => {
    const backlog = sumDeckBacklog('Notion Sync::A', [
      deck('Notion Sync::Apple', { review: 9, learning: 9, new: 9 }),
    ]);
    expect(backlog).toEqual({ due: 0, fresh: 0 });
  });

  test('returns zero when no deck matches', () => {
    const backlog = sumDeckBacklog('Notion Sync::A', [
      deck('Notion Sync::B', { review: 9, new: 9 }),
    ]);
    expect(backlog).toEqual({ due: 0, fresh: 0 });
  });
});

describe('formatBacklog', () => {
  test('renders both due and new', () => {
    expect(formatBacklog({ due: 7, fresh: 3 })).toBe('▲7 · +3 new');
  });

  test('renders only due when no new cards', () => {
    expect(formatBacklog({ due: 7, fresh: 0 })).toBe('▲7');
  });

  test('renders only new when nothing due', () => {
    expect(formatBacklog({ due: 0, fresh: 3 })).toBe('+3 new');
  });

  test('renders nothing when the deck is clear', () => {
    expect(formatBacklog({ due: 0, fresh: 0 })).toBeNull();
  });
});

describe('formatMaturity', () => {
  test('computes the percentage from mature over total', () => {
    expect(formatMaturity(30, 120)).toBe('25% mature');
  });

  test('rounds to the nearest whole percent', () => {
    expect(formatMaturity(1, 3)).toBe('33% mature');
  });

  test('returns null when there are no cards', () => {
    expect(formatMaturity(0, 0)).toBeNull();
  });
});
