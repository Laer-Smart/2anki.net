export type FailureReasonBucket = 'paywall' | 'empty' | 'technical';

export const REASON_PROP_EXPRESSION = "props->>'reason'";

export const PAYWALL_REASON_PATTERNS = [
  'monthly_limit',
  'anonymous_cap',
  '%"code":"monthly_limit"%',
];

export const EMPTY_REASON_PATTERNS = [
  'empty_deck',
  'no_decks_created',
  'No cards in this deck yet.%',
];

function likeToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const body = escaped.replace(/%/g, '.*').replace(/_/g, '.');
  return new RegExp(`^${body}$`, 's');
}

function matchesAny(reason: string, patterns: string[]): boolean {
  return patterns.some((pattern) => likeToRegExp(pattern).test(reason));
}

export function classifyFailureReason(
  reason: string | null | undefined
): FailureReasonBucket {
  if (reason == null) return 'technical';
  if (matchesAny(reason, PAYWALL_REASON_PATTERNS)) return 'paywall';
  if (matchesAny(reason, EMPTY_REASON_PATTERNS)) return 'empty';
  return 'technical';
}
