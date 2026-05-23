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
TEMPLATE OVERRIDE — basic + reverse:
Each card will appear in Anki as BOTH a question→answer AND answer→question pair. Make sure every card makes sense in both directions (e.g. terms and definitions, language pairs).`,
  cloze: `
TEMPLATE OVERRIDE — cloze deletion (this overrides any earlier instruction about front/back cards):

EVERY card you emit must be a cloze deletion. Do not produce any front/back Q&A pairs in this conversation. For each card:
- "front" contains the full sentence with the answer wrapped as {{c1::answer}}
- "back" is the empty string ""
- Use {{c1::...}}, {{c2::...}} for multiple blanks in the same sentence
- Do NOT use bare ___ placeholders

Example output for the topic "capitals":

\`\`\`json
[
  {"front": "The capital of Norway is {{c1::Oslo}}.", "back": ""},
  {"front": "The capital of {{c1::France}} is Paris.", "back": ""}
]
\`\`\``,
};

export function templatePromptSuffix(slug: ChatCardTemplate): string {
  return TEMPLATE_PROMPT_SUFFIX[slug];
}
