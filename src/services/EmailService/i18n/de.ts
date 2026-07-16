import { DeepPartial, EmailStrings } from './types';

export const de: DeepPartial<EmailStrings> = {
  resetPassword: {
    subject: 'Setze dein 2anki.net-Passwort zurück',
    heading: 'Passwort zurücksetzen',
    body: 'Setze dein 2anki.net-Passwort über die Schaltfläche unten zurück.',
    cta: 'Passwort zurücksetzen',
    disclaimer:
      'Nicht angefordert? Ignoriere diese Nachricht. Dein Passwort bleibt unverändert.',
    text: 'Wir haben deine Anfrage zum Ändern des Passworts erhalten. Du kannst es hier ändern: {{link}}',
  },
  magicLinkLogin: {
    subject: 'Dein 2anki-Anmeldelink',
    heading: 'Bei 2anki.net anmelden',
    description:
      'Klicke auf die Schaltfläche unten, um dich bei deinem Konto anzumelden.',
    cta: 'Anmelden',
    text: 'Melde dich mit diesem Link bei deinem 2anki-Konto an: {{link}}',
  },
  magicLinkReset: {
    subject: 'Setze dein 2anki-Passwort zurück',
    heading: 'Setze dein 2anki.net-Passwort zurück',
    description:
      'Klicke auf die Schaltfläche unten, um dein Passwort zurückzusetzen.',
    cta: 'Passwort zurücksetzen',
    text: 'Setze dein 2anki-Passwort mit diesem Link zurück: {{link}}',
  },
  magicLinkShared: {
    expiry: 'Dieser Link läuft in 15 Minuten ab.',
    disclaimer:
      'Nicht angefordert? Ignoriere diese Nachricht. An deinem Konto wird nichts geändert.',
  },
  deckReady: {
    subject: '2anki.net – Dein Stapel «{{filename}}» ist fertig',
    heading: 'Dein Stapel ist fertig',
    bodyAttached:
      'Dein umgewandelter Stapel hängt an dieser E-Mail. Importiere ihn in Anki, um mit dem Lernen zu beginnen.',
    bodyTrouble: 'Probleme? Antworte einfach auf diese E-Mail.',
    disclaimerPrefix:
      'Diese Konvertierung nicht angefordert? Kontaktiere uns unter ',
    disclaimerSuffix: '.',
    cardSingular: 'Karte',
    cardPlural: 'Karten',
    textReadyPrefix: 'Dein Stapel ist fertig: ',
    textAttached: '. Er hängt an dieser E-Mail.',
  },
};
