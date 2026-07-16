export interface ResetPasswordStrings {
  subject: string;
  heading: string;
  body: string;
  cta: string;
  disclaimer: string;
  text: string;
}

export interface MagicLinkVariantStrings {
  subject: string;
  heading: string;
  description: string;
  cta: string;
  text: string;
}

export interface MagicLinkSharedStrings {
  expiry: string;
  disclaimer: string;
}

export interface DeckReadyStrings {
  subject: string;
  heading: string;
  bodyAttached: string;
  bodyTrouble: string;
  disclaimerPrefix: string;
  disclaimerSuffix: string;
  cardSingular: string;
  cardPlural: string;
  textReadyPrefix: string;
  textAttached: string;
}

export interface EmailStrings {
  resetPassword: ResetPasswordStrings;
  magicLinkLogin: MagicLinkVariantStrings;
  magicLinkReset: MagicLinkVariantStrings;
  magicLinkShared: MagicLinkSharedStrings;
  deckReady: DeckReadyStrings;
}

export type SupportedEmailLanguage = 'en' | 'de';

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends string ? T[K] : DeepPartial<T[K]>;
};
