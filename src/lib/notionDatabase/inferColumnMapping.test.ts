import { inferColumnMapping } from './inferColumnMapping';

describe('inferColumnMapping', () => {
  it('maps canonical Term/Definition columns', () => {
    expect(inferColumnMapping(['Term', 'Definition'])).toEqual({
      frontField: 'Term',
      backField: 'Definition',
      ambiguous: false,
    });
  });

  it.each([
    ['Word', 'Translation'],
    ['Front', 'Back'],
    ['Question', 'Answer'],
    ['Vocabulary', 'Meaning'],
  ])('maps %s → %s', (front, back) => {
    expect(inferColumnMapping([front, back])).toEqual({
      frontField: front,
      backField: back,
      ambiguous: false,
    });
  });

  it('is case-insensitive on column names', () => {
    expect(inferColumnMapping(['term', 'definition'])).toMatchObject({
      frontField: 'term',
      backField: 'definition',
      ambiguous: false,
    });
  });

  it('ignores non-canonical columns alongside canonical ones', () => {
    const result = inferColumnMapping(['Notes', 'Term', 'Tags', 'Definition', 'Created']);
    expect(result).toEqual({
      frontField: 'Term',
      backField: 'Definition',
      ambiguous: false,
    });
  });

  it('flags ambiguous when no front candidate matches', () => {
    expect(inferColumnMapping(['Notes', 'Tags', 'Definition'])).toMatchObject({
      frontField: null,
      backField: 'Definition',
      ambiguous: true,
    });
  });

  it('flags ambiguous when no back candidate matches', () => {
    expect(inferColumnMapping(['Term', 'Notes', 'Tags'])).toMatchObject({
      frontField: 'Term',
      backField: null,
      ambiguous: true,
    });
  });

  it('flags ambiguous when both sides have multiple candidates', () => {
    const result = inferColumnMapping(['Term', 'Word', 'Definition', 'Meaning']);
    expect(result.ambiguous).toBe(true);
  });

  it('returns ambiguous when no canonical columns at all', () => {
    expect(inferColumnMapping(['Notes', 'Tags', 'Created'])).toEqual({
      frontField: null,
      backField: null,
      ambiguous: true,
    });
  });

  it('returns ambiguous on an empty list', () => {
    expect(inferColumnMapping([])).toEqual({
      frontField: null,
      backField: null,
      ambiguous: true,
    });
  });
});
