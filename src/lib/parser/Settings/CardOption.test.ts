import CardOption from './CardOption';

describe('CardOption codeTheme', () => {
  it('defaults to github when the option is absent', () => {
    const option = new CardOption({});
    expect(option.codeTheme).toBe('github');
  });

  it('reads a known theme from the payload', () => {
    const option = new CardOption({ 'code-theme': 'dracula' });
    expect(option.codeTheme).toBe('dracula');
  });

  it('falls back to github for an unknown theme', () => {
    const option = new CardOption({ 'code-theme': 'not-a-theme' });
    expect(option.codeTheme).toBe('github');
  });

  it('ships code-theme in the default options payload', () => {
    expect(CardOption.LoadDefaultOptions()['code-theme']).toBe('github');
  });
});
