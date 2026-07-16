import { getEmailStrings, mergeStrings } from './index';
import { EmailStrings } from './types';

describe('getEmailStrings', () => {
  it('returns English copy for a null language', () => {
    const strings = getEmailStrings(null);
    expect(strings.resetPassword.subject).toBe('Reset your 2anki.net password');
    expect(strings.deckReady.heading).toBe('Your deck is ready');
    expect(strings.magicLinkLogin.cta).toBe('Sign in');
  });

  it('returns English copy for an unsupported language', () => {
    const strings = getEmailStrings('fr');
    expect(strings.resetPassword.subject).toBe('Reset your 2anki.net password');
    expect(strings.deckReady.cardPlural).toBe('cards');
  });

  it('returns German copy for the de language', () => {
    const strings = getEmailStrings('de');
    expect(strings.resetPassword.subject).toBe(
      'Setze dein 2anki.net-Passwort zurück'
    );
    expect(strings.resetPassword.cta).toBe('Passwort zurücksetzen');
    expect(strings.magicLinkLogin.subject).toBe('Dein 2anki-Anmeldelink');
    expect(strings.magicLinkLogin.cta).toBe('Anmelden');
    expect(strings.deckReady.heading).toBe('Dein Stapel ist fertig');
    expect(strings.deckReady.cardPlural).toBe('Karten');
    expect(strings.deckReady.cardSingular).toBe('Karte');
  });

  it('keeps the {{link}} and {{filename}} placeholders in German copy', () => {
    const strings = getEmailStrings('de');
    expect(strings.resetPassword.text).toContain('{{link}}');
    expect(strings.magicLinkReset.text).toContain('{{link}}');
    expect(strings.deckReady.subject).toContain('{{filename}}');
  });
});

describe('mergeStrings per-key English fallback', () => {
  const base: EmailStrings = getEmailStrings('en');

  it('falls back to English for a key missing from the override', () => {
    const merged = mergeStrings(base, {
      resetPassword: { heading: 'Passwort zurücksetzen' },
    });
    expect(merged.resetPassword.heading).toBe('Passwort zurücksetzen');
    expect(merged.resetPassword.subject).toBe('Reset your 2anki.net password');
    expect(merged.deckReady.heading).toBe('Your deck is ready');
  });

  it('falls back to English for an empty-string override value', () => {
    const merged = mergeStrings(base, {
      magicLinkLogin: { cta: '' },
    });
    expect(merged.magicLinkLogin.cta).toBe('Sign in');
  });

  it('returns the base unchanged when the override is undefined', () => {
    const merged = mergeStrings(base, undefined);
    expect(merged).toEqual(base);
  });
});
