import { ANKI_MATH_FRAGMENT } from './ankiMathFragment';

describe('ANKI_MATH_FRAGMENT', () => {
  it('specifies inline math delimiter as \\(...\\)', () => {
    expect(ANKI_MATH_FRAGMENT).toContain('\\(...\\)');
  });

  it('specifies display math delimiter as \\[...\\]', () => {
    expect(ANKI_MATH_FRAGMENT).toContain('\\[...\\]');
  });

  it('explicitly forbids $...$ inline delimiter', () => {
    expect(ANKI_MATH_FRAGMENT).toMatch(/NEVER\s+\$\.\.\.\$/);
  });

  it('explicitly forbids $$...$$ display delimiter', () => {
    expect(ANKI_MATH_FRAGMENT).toMatch(/NEVER\s+\$\$\.\.\.\$\$/);
  });

  it('includes a chemistry example using \\ce{}', () => {
    expect(ANKI_MATH_FRAGMENT).toContain('\\ce{');
  });
});
