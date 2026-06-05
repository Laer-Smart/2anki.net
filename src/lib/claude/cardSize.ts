const VALID_SIZES = new Set(['short', 'medium', 'detailed']);

export function getCardSizePromptSuffix(size: string | undefined): string {
  if (size === 'short') {
    return 'Card size: 1 fact per card, target ~80 characters per answer.';
  }
  if (size === 'medium') {
    return 'Card size: 1-2 facts per card, target ~160 characters per answer.';
  }
  if (size === 'detailed') {
    return 'Card size: 3-4 facts per card, target ~320 characters per answer.';
  }
  return '';
}

export function validateCardSize(
  raw: string | undefined
): 'short' | 'medium' | 'detailed' {
  if (raw != null && VALID_SIZES.has(raw)) {
    return raw as 'short' | 'medium' | 'detailed';
  }
  return 'medium';
}
