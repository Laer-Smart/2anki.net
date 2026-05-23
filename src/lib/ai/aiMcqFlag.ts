export function isAiMcqEnabled(input: { isPaying: boolean }): boolean {
  if (!input.isPaying) return false;
  return process.env.AI_MCQ_ENABLED === 'true';
}
