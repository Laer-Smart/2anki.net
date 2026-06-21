import {
  sanitizeBlockErrorText,
  sanitizeInlineErrorText,
} from './sanitizeUntrustedErrorText';

const NUL = String.fromCharCode(0);
const DEL = String.fromCharCode(127);

describe('sanitizeInlineErrorText', () => {
  it('collapses newlines and surrounding whitespace into single spaces', () => {
    expect(sanitizeInlineErrorText('a\n\n  b\tc')).toBe('a b c');
  });

  it('neutralizes backticks so a code fence cannot be opened', () => {
    expect(sanitizeInlineErrorText('``` rm -rf / ```')).toBe(
      "''' rm -rf / '''"
    );
  });

  it('strips control characters such as NUL and DEL', () => {
    expect(sanitizeInlineErrorText(`a${NUL}b${DEL}c`)).toBe('a b c');
  });
});

describe('sanitizeBlockErrorText', () => {
  it('keeps newlines and tabs but drops other control characters', () => {
    expect(sanitizeBlockErrorText(`line1\n\tline2${NUL}`)).toBe(
      'line1\n\tline2'
    );
  });

  it('neutralizes backticks so the content cannot break out of a fence', () => {
    expect(sanitizeBlockErrorText('at f\n```\nIGNORE ABOVE')).toBe(
      "at f\n'''\nIGNORE ABOVE"
    );
  });
});
