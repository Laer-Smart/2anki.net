import { getCodeThemeCss } from './helper';

describe('getCodeThemeCss', () => {
  it('returns the GitHub token rules for the github theme', () => {
    const css = getCodeThemeCss('github');
    expect(css).toContain('.hljs-keyword');
    expect(css).toContain('#d73a49');
  });

  it('ships a dark-mode block in every theme', () => {
    for (const name of ['github', 'one-dark', 'solarized', 'dracula']) {
      expect(getCodeThemeCss(name)).toContain(
        '@media (prefers-color-scheme: dark)'
      );
    }
  });

  it('returns distinct token colors per theme', () => {
    expect(getCodeThemeCss('one-dark')).toContain('#c678dd');
    expect(getCodeThemeCss('solarized')).toContain('#fdf6e3');
    expect(getCodeThemeCss('dracula')).toContain('#282a36');
  });

  it('falls back to github for an unknown theme name', () => {
    expect(getCodeThemeCss('totally-not-a-theme')).toBe(
      getCodeThemeCss('github')
    );
  });

  it('falls back to github for an empty or path-traversal name', () => {
    expect(getCodeThemeCss('')).toBe(getCodeThemeCss('github'));
    expect(getCodeThemeCss('../notion')).toBe(getCodeThemeCss('github'));
  });
});
