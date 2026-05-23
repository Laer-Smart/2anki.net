export function getCardStylePromptFragment(style: string | undefined): string {
  if (style === 'heading-driven') {
    return 'For each chunk, produce 2–6 cards. Each card\'s front references this chunk\'s heading; each card\'s back holds one fact.';
  }
  return '';
}
