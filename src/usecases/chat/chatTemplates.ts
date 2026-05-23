export type ChatCardTemplate = 'basic' | 'basic-and-reversed' | 'cloze';

export const VALID_TEMPLATE_SLUGS: ReadonlySet<ChatCardTemplate> = new Set([
  'basic',
  'basic-and-reversed',
  'cloze',
]);

export function isChatCardTemplate(value: unknown): value is ChatCardTemplate {
  return typeof value === 'string' && (VALID_TEMPLATE_SLUGS as Set<string>).has(value);
}

const TEMPLATE_PROMPT_SUFFIX: Record<ChatCardTemplate, string> = {
  basic: '',
  'basic-and-reversed': `
Each card will appear as BOTH a question→answer AND answer→question pair in Anki. Make sure each card makes sense in both directions.`,
  cloze: `
Generate cards as fill-in-the-blank cloze deletions only. Use Anki cloze syntax: {{c1::answer}}. Do not use bare ___ placeholders.`,
};

export function templatePromptSuffix(slug: ChatCardTemplate): string {
  return TEMPLATE_PROMPT_SUFFIX[slug];
}
