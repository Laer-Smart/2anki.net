import { ownedDeckNames, userOwnsDeck } from './deckOwnership';

describe('deckOwnership', () => {
  test('ownedDeckNames derives the deck name from target_deck override', () => {
    expect(
      ownedDeckNames([
        { target_deck: 'MS3::Pharmacology', notion_page_title: 'Ignored' },
      ])
    ).toEqual(['MS3::Pharmacology']);
  });

  test('ownedDeckNames falls back to the Notion Sync title path', () => {
    expect(
      ownedDeckNames([{ target_deck: null, notion_page_title: 'Biochem' }])
    ).toEqual(['Notion Sync::Biochem']);
  });

  test('userOwnsDeck matches an exact owned deck name', () => {
    expect(
      userOwnsDeck('MS3::Pharmacology', [
        { target_deck: 'MS3::Pharmacology', notion_page_title: null },
      ])
    ).toBe(true);
  });

  test('userOwnsDeck matches a descendant subdeck of an owned deck', () => {
    expect(
      userOwnsDeck('Notion Sync::Biochem::Lecture 1', [
        { target_deck: null, notion_page_title: 'Biochem' },
      ])
    ).toBe(true);
  });

  test('userOwnsDeck rejects a deck the user does not own', () => {
    expect(
      userOwnsDeck('Default', [
        { target_deck: 'MS3::Pharmacology', notion_page_title: null },
      ])
    ).toBe(false);
  });

  test('userOwnsDeck rejects a prefix that is not a hierarchy boundary', () => {
    expect(
      userOwnsDeck('MS3::PharmacologyExtra', [
        { target_deck: 'MS3::Pharmacology', notion_page_title: null },
      ])
    ).toBe(false);
  });

  test('userOwnsDeck rejects an empty or whitespace deck', () => {
    expect(
      userOwnsDeck('   ', [
        { target_deck: 'MS3::Pharmacology', notion_page_title: null },
      ])
    ).toBe(false);
  });
});
