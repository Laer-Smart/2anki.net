export const FEATURE_INTEREST_KEYS = [
  'study_reminders',
  'deck_folders',
] as const;

export type FeatureInterestKey = (typeof FEATURE_INTEREST_KEYS)[number];

const KNOWN_KEYS = new Set<string>(FEATURE_INTEREST_KEYS);

export function isKnownFeatureKey(value: unknown): value is FeatureInterestKey {
  return typeof value === 'string' && KNOWN_KEYS.has(value);
}
