import ParserRules from './ParserRules';

describe('ParserRules.setDeckTypes', () => {
  it('replaces DECK with the provided types', () => {
    const rules = new ParserRules();
    rules.setDeckTypes(['page']);
    expect(rules.DECK).toEqual(['page']);
    expect(rules.permitsDeckAsPage()).toBe(true);
  });

  it('keeps database when only database is selected', () => {
    const rules = new ParserRules();
    rules.setDeckTypes(['database']);
    expect(rules.DECK).toEqual(['database']);
    expect(rules.permitsDeckAsPage()).toBe(false);
  });

  it('throws when given an empty array', () => {
    const rules = new ParserRules();
    expect(() => rules.setDeckTypes([])).toThrow();
    expect(rules.DECK).toEqual(['page', 'database']);
  });

  it('throws on unknown block types', () => {
    const rules = new ParserRules();
    expect(() => rules.setDeckTypes(['page', 'toggle'])).toThrow();
    expect(rules.DECK).toEqual(['page', 'database']);
  });

  it('dedupes while preserving order', () => {
    const rules = new ParserRules();
    rules.setDeckTypes(['database', 'page', 'database']);
    expect(rules.DECK).toEqual(['database', 'page']);
  });

  it('default DECK contains page and database', () => {
    const rules = new ParserRules();
    expect(rules.DECK).toEqual(['page', 'database']);
  });

  it('exposes the allowlist for callers that need to validate input', () => {
    expect(ParserRules.DECK_TYPE_ALLOWLIST).toEqual(['page', 'database']);
  });
});
