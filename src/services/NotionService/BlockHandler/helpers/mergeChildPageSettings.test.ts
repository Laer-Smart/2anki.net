import CardOption from '../../../../lib/parser/Settings';
import mergeChildPageSettings from './mergeChildPageSettings';

describe('mergeChildPageSettings', () => {
  it('takes the child deck name and inherits every other field from the parent', () => {
    const parent = new CardOption({
      ...CardOption.LoadDefaultOptions(),
      deckName: 'Parent deck',
      'font-size': '30px',
    });
    const child = new CardOption({
      ...CardOption.LoadDefaultOptions(),
      deckName: 'Child deck',
      'font-size': '12px',
    });

    const merged = mergeChildPageSettings(parent, child);

    expect(merged.deckName).toBe('Child deck');
    expect(merged.fontSize).toBe('30px');
  });

  it('clears the deck name when the child has none, inheriting the rest', () => {
    const parent = new CardOption({
      ...CardOption.LoadDefaultOptions(),
      deckName: 'Parent deck',
    });
    const child = new CardOption(CardOption.LoadDefaultOptions());

    const merged = mergeChildPageSettings(parent, child);

    expect(merged.deckName).toBeUndefined();
  });

  it('does not mutate the parent', () => {
    const parent = new CardOption({
      ...CardOption.LoadDefaultOptions(),
      deckName: 'Parent deck',
    });
    const child = new CardOption({
      ...CardOption.LoadDefaultOptions(),
      deckName: 'Child deck',
    });

    mergeChildPageSettings(parent, child);

    expect(parent.deckName).toBe('Parent deck');
  });
});
