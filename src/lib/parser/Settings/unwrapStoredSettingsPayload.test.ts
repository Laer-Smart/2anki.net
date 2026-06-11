import { unwrapStoredSettingsPayload } from './unwrapStoredSettingsPayload';

describe('unwrapStoredSettingsPayload', () => {
  it('returns the inner options for a legacy wrapper row', () => {
    const stored = {
      object_id: 'page-a',
      title: 'A',
      payload: { deckName: 'My Deck', template: 'specialstyle' },
    };

    expect(unwrapStoredSettingsPayload(stored)).toEqual({
      deckName: 'My Deck',
      template: 'specialstyle',
    });
  });

  it('returns the flat options unchanged for a new-shape row', () => {
    const stored = { deckName: 'My Deck', template: 'specialstyle' };

    expect(unwrapStoredSettingsPayload(stored)).toEqual({
      deckName: 'My Deck',
      template: 'specialstyle',
    });
  });

  it('parses a JSON string column before unwrapping a legacy wrapper', () => {
    const stored = JSON.stringify({
      object_id: 'page-a',
      payload: { deckName: 'My Deck' },
    });

    expect(unwrapStoredSettingsPayload(stored)).toEqual({
      deckName: 'My Deck',
    });
  });

  it('parses a JSON string column for a flat row', () => {
    const stored = JSON.stringify({ deckName: 'My Deck' });

    expect(unwrapStoredSettingsPayload(stored)).toEqual({
      deckName: 'My Deck',
    });
  });

  it('returns an empty object for null', () => {
    expect(unwrapStoredSettingsPayload(null)).toEqual({});
  });

  it('returns an empty object for unparseable strings', () => {
    expect(unwrapStoredSettingsPayload('not json')).toEqual({});
  });

  it('treats a nested non-object payload as flat options', () => {
    const stored = { deckName: 'My Deck', payload: 'show-all' };

    expect(unwrapStoredSettingsPayload(stored)).toEqual({
      deckName: 'My Deck',
      payload: 'show-all',
    });
  });
});
