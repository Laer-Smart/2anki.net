import { describe, expect, test } from 'vitest';

import { buildDeckName, isSelfOrDescendantDeck } from './deckName';

describe('buildDeckName', () => {
  test('uses the override path when present', () => {
    expect(buildDeckName('MS3::Pharmacology', 'Anything')).toBe(
      'MS3::Pharmacology'
    );
  });

  test('falls back to Notion Sync::<title> when no override', () => {
    expect(buildDeckName(null, 'Small Bowel Cancer')).toBe(
      'Notion Sync::Small Bowel Cancer'
    );
  });

  test('falls back to Untitled when title is empty', () => {
    expect(buildDeckName(null, '')).toBe('Notion Sync::Untitled');
  });

  test('falls back to Untitled when title is null', () => {
    expect(buildDeckName(null, null)).toBe('Notion Sync::Untitled');
  });

  test('trims segments and drops empties in the override', () => {
    expect(buildDeckName('  A  ::  B  ', 'X')).toBe('A::B');
  });

  test('collapses long colon runs to the hierarchy separator', () => {
    expect(buildDeckName('A::::B', 'X')).toBe('A::B');
  });

  test('strips disallowed characters from the override', () => {
    expect(buildDeckName('A"<::B', 'X')).toBe('A::B');
  });

  test('preserves spaces and commas inside segments', () => {
    expect(buildDeckName('Notion Sync::Week 18, Lenses', 'X')).toBe(
      'Notion Sync::Week 18, Lenses'
    );
  });
});

describe('isSelfOrDescendantDeck', () => {
  test('matches the deck itself', () => {
    expect(isSelfOrDescendantDeck('Notion Sync::A', 'Notion Sync::A')).toBe(
      true
    );
  });

  test('matches a hierarchy descendant', () => {
    expect(
      isSelfOrDescendantDeck('Notion Sync::A::Child', 'Notion Sync::A')
    ).toBe(true);
  });

  test('rejects a bare prefix that is not a hierarchy boundary', () => {
    expect(isSelfOrDescendantDeck('Notion Sync::Apple', 'Notion Sync::A')).toBe(
      false
    );
  });

  test('rejects an unrelated deck', () => {
    expect(isSelfOrDescendantDeck('Notion Sync::B', 'Notion Sync::A')).toBe(
      false
    );
  });
});
