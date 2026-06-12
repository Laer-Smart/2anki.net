import { describe, expect, it } from 'vitest';
import { isEmbeddedAppWebView } from './isEmbeddedAppWebView';

describe('isEmbeddedAppWebView', () => {
  it('matches the native 2anki iOS app user agent', () => {
    expect(isEmbeddedAppWebView('2anki-iOS-App/1.0 (WKWebView)')).toBe(true);
  });

  it('matches a bare WKWebView token', () => {
    expect(
      isEmbeddedAppWebView(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) WKWebView'
      )
    ).toBe(true);
  });

  it('does not match a normal Safari user agent', () => {
    expect(
      isEmbeddedAppWebView(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
      )
    ).toBe(false);
  });

  it('does not match a normal Chrome user agent', () => {
    expect(
      isEmbeddedAppWebView(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
      )
    ).toBe(false);
  });

  it('does not match an empty string', () => {
    expect(isEmbeddedAppWebView('')).toBe(false);
  });
});
