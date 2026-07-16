import { EmailStrings } from './types';

export const en: EmailStrings = {
  resetPassword: {
    subject: 'Reset your 2anki.net password',
    heading: 'Reset your password',
    body: 'Reset your 2anki.net password using the button below.',
    cta: 'Reset password',
    disclaimer:
      'Did not request this? Ignore this message. Your password remains unchanged.',
    text: 'We received your password change request, you can change it here {{link}}',
  },
  magicLinkLogin: {
    subject: 'Your 2anki login link',
    heading: 'Sign in to 2anki.net',
    description: 'Click the button below to sign in to your account.',
    cta: 'Sign in',
    text: 'Sign in to your 2anki account using this link: {{link}}',
  },
  magicLinkReset: {
    subject: 'Reset your 2anki password',
    heading: 'Reset your 2anki.net password',
    description: 'Click the button below to reset your password.',
    cta: 'Reset password',
    text: 'Reset your 2anki password using this link: {{link}}',
  },
  magicLinkShared: {
    expiry: 'This link expires in 15 minutes.',
    disclaimer:
      'Did not request this? Ignore this message. No changes will be made to your account.',
  },
  deckReady: {
    subject: '2anki.net - Your «{{filename}}» deck is ready',
    heading: 'Your deck is ready',
    bodyAttached:
      'Your converted deck is attached to this email. Import it into Anki to start studying.',
    bodyTrouble: 'Having trouble? Reply to this email.',
    disclaimerPrefix: 'Did not request this conversion? Contact us at ',
    disclaimerSuffix: '.',
    cardSingular: 'card',
    cardPlural: 'cards',
    textReadyPrefix: 'Your deck is ready: ',
    textAttached: '. It is attached to this email.',
  },
};
