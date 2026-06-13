import { describe, expect, test } from 'vitest';

import { apkgFilenameForDeck } from './downloadDeckPackage';

describe('apkgFilenameForDeck', () => {
  test('uses the last hierarchy segment', () => {
    expect(apkgFilenameForDeck('Notion Sync::Pharmacology')).toBe(
      'Pharmacology.apkg'
    );
  });

  test('replaces disallowed characters with underscores', () => {
    expect(apkgFilenameForDeck('Notion Sync::Week 18, Lenses')).toBe(
      'Week_18_Lenses.apkg'
    );
  });

  test('trims leading and trailing underscores', () => {
    expect(apkgFilenameForDeck('Notion Sync:: / ')).toBe('deck.apkg');
  });

  test('keeps a bare deck name without hierarchy', () => {
    expect(apkgFilenameForDeck('Default')).toBe('Default.apkg');
  });
});
