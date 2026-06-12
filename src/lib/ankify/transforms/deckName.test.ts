import { buildChildDeckName, buildDeckName } from './deckName';

describe('buildDeckName', () => {
  it('uses the sanitized override when present', () => {
    expect(buildDeckName('MS3::GI', 'Ignored')).toBe('MS3::GI');
  });

  it('falls back to the Notion Sync parent with the page title', () => {
    expect(buildDeckName(null, 'Cell Biology')).toBe(
      'Notion Sync::Cell Biology'
    );
  });

  it('falls back to Untitled when the title is missing', () => {
    expect(buildDeckName(null, null)).toBe('Notion Sync::Untitled');
  });
});

describe('buildChildDeckName', () => {
  it('nests the child title under the parent deck', () => {
    expect(buildChildDeckName('Notion Sync::Histology', 'Cell Biology')).toBe(
      'Notion Sync::Histology::Cell Biology'
    );
  });

  it('nests under a target-deck override path', () => {
    expect(buildChildDeckName('MS3::GI', 'Cell Biology')).toBe(
      'MS3::GI::Cell Biology'
    );
  });

  it.each([null, undefined, '', '  '])(
    'falls back to Untitled for a missing child title (%p)',
    (title) => {
      expect(buildChildDeckName('MS3::GI', title)).toBe('MS3::GI::Untitled');
    }
  );

  it('strips deck separators inside the child title', () => {
    expect(buildChildDeckName('MS3', 'A::B')).toBe('MS3::AB');
  });
});
