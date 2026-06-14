import { describe, expect, test } from 'vitest';

import { buildDeckTree } from './buildDeckTree';
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

describe('buildDeckTree', () => {
  test('orders parents before children by fullName ascending', () => {
    const tree = buildDeckTree([
      deck('Spanish::Verbs'),
      deck('Spanish'),
      deck('Anatomy'),
    ]);

    expect(tree.map((node) => node.deck.fullName)).toEqual([
      'Anatomy',
      'Spanish',
      'Spanish::Verbs',
    ]);
  });

  test('carries the depth of each deck through', () => {
    const tree = buildDeckTree([deck('A'), deck('A::B'), deck('A::B::C')]);

    expect(tree.map((node) => node.depth)).toEqual([0, 1, 2]);
  });

  test('rolls own + descendant counts into the aggregate for a parent', () => {
    const tree = buildDeckTree([
      deck('Spanish', { review: 5, learning: 2, new: 3 }),
      deck('Spanish::Verbs', { review: 1, learning: 1, new: 4 }),
    ]);

    const parent = tree.find((node) => node.deck.fullName === 'Spanish');
    expect(parent).toMatchObject({
      aggregateDue: 6,
      aggregateLearning: 3,
      aggregateNew: 7,
    });
  });

  test('leaf aggregate equals its own counts', () => {
    const tree = buildDeckTree([
      deck('Spanish', { review: 5, learning: 2, new: 3 }),
      deck('Spanish::Verbs', { review: 1, learning: 1, new: 4 }),
    ]);

    const child = tree.find((node) => node.deck.fullName === 'Spanish::Verbs');
    expect(child).toMatchObject({
      aggregateDue: 1,
      aggregateLearning: 1,
      aggregateNew: 4,
    });
  });

  test('marks a node with descendants as hasChildren and a leaf as not', () => {
    const tree = buildDeckTree([
      deck('Spanish'),
      deck('Spanish::Verbs'),
      deck('Anatomy'),
    ]);

    const parent = tree.find((node) => node.deck.fullName === 'Spanish');
    const child = tree.find((node) => node.deck.fullName === 'Spanish::Verbs');
    const standalone = tree.find((node) => node.deck.fullName === 'Anatomy');

    expect(parent?.hasChildren).toBe(true);
    expect(child?.hasChildren).toBe(false);
    expect(standalone?.hasChildren).toBe(false);
  });

  test('a bare-prefix sibling does not count as a child', () => {
    const tree = buildDeckTree([deck('Spanish'), deck('Spanish Advanced')]);

    const parent = tree.find((node) => node.deck.fullName === 'Spanish');
    expect(parent?.hasChildren).toBe(false);
  });

  test('a bare-prefix sibling is NOT absorbed into the parent aggregate', () => {
    const tree = buildDeckTree([
      deck('Spanish', { review: 1 }),
      deck('Spanish Advanced', { review: 100 }),
      deck('Spanish::Verbs', { review: 4 }),
    ]);

    const parent = tree.find((node) => node.deck.fullName === 'Spanish');
    expect(parent?.aggregateDue).toBe(5);
    const sibling = tree.find(
      (node) => node.deck.fullName === 'Spanish Advanced'
    );
    expect(sibling?.aggregateDue).toBe(100);
  });
});
