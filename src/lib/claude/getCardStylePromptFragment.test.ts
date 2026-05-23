import { getCardStylePromptFragment } from './getCardStylePromptFragment';

describe('getCardStylePromptFragment', () => {
  it('returns a heading-driven fragment for heading-driven style', () => {
    const fragment = getCardStylePromptFragment('heading-driven');
    expect(fragment.length).toBeGreaterThan(0);
    expect(fragment.toLowerCase()).toContain('heading');
    expect(fragment).toContain('2');
    expect(fragment).toContain('6');
  });

  it('returns a cloze fragment for cloze style', () => {
    const fragment = getCardStylePromptFragment('cloze');
    expect(fragment.length).toBeGreaterThan(0);
    expect(fragment.toLowerCase()).toContain('cloze');
  });

  it('returns a qa fragment for qa style', () => {
    const fragment = getCardStylePromptFragment('qa');
    expect(fragment.length).toBeGreaterThan(0);
    expect(fragment.toLowerCase()).toContain('question');
  });

  it('returns an empty string for unknown / default style', () => {
    expect(getCardStylePromptFragment(undefined)).toBe('');
  });

  it('returns an empty string for an unrecognised style value', () => {
    expect(getCardStylePromptFragment('concise')).toBe('');
  });
});
