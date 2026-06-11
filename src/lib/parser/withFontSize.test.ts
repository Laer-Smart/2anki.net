import { withFontSize } from './withFontSize';

describe('withFontSize', () => {
  const baseStyle = '.card { font-family: sans-serif }';

  it('emits no rule when the value is empty', () => {
    expect(withFontSize(baseStyle, '')).toBe(baseStyle);
  });

  it('emits no rule when the value is undefined', () => {
    expect(withFontSize(baseStyle, undefined)).toBe(baseStyle);
  });

  it('emits no rule for the unitless default 20', () => {
    expect(withFontSize(baseStyle, '20')).toBe(baseStyle);
  });

  it('emits no rule for the legacy default 20px', () => {
    expect(withFontSize(baseStyle, '20px')).toBe(baseStyle);
  });

  it('appends a font-size rule for a bare integer from the range slider', () => {
    expect(withFontSize(baseStyle, '18')).toBe(
      `${baseStyle}\n* { font-size:18px}`
    );
  });

  it('appends a font-size rule for a value with a px unit', () => {
    expect(withFontSize(baseStyle, '14px')).toBe(
      `${baseStyle}\n* { font-size:14px}`
    );
  });

  it('appends a font-size rule for an em value', () => {
    expect(withFontSize(baseStyle, '1.2em')).toBe(
      `${baseStyle}\n* { font-size:1.2em}`
    );
  });

  it('rejects a CSS-injection payload and emits no rule', () => {
    expect(withFontSize(baseStyle, '20px } * { display:none')).toBe(baseStyle);
  });

  it('rejects an out-of-range value and emits no rule', () => {
    expect(withFontSize(baseStyle, '9999')).toBe(baseStyle);
  });

  it('rejects a value with an unsupported unit and emits no rule', () => {
    expect(withFontSize(baseStyle, '18pt')).toBe(baseStyle);
  });

  it('passes a null style through unchanged', () => {
    expect(withFontSize(null, '18')).toBeNull();
  });
});
