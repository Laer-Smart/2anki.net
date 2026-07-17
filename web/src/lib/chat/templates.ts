export type ChatCardTemplate = 'basic' | 'basic-and-reversed' | 'cloze' | 'mcq';

export interface ChatTemplateOption {
  slug: ChatCardTemplate;
  label: string;
  fieldHint: string;
}

export const CHAT_TEMPLATE_OPTIONS: ChatTemplateOption[] = [
  { slug: 'basic', label: 'Basic', fieldHint: 'Front / Back' },
  {
    slug: 'basic-and-reversed',
    label: 'Basic + Reverse',
    fieldHint: 'Front / Back (both directions)',
  },
  { slug: 'cloze', label: 'Cloze', fieldHint: 'Front with {{c1::blanks}}' },
  {
    slug: 'mcq',
    label: 'Multiple choice',
    fieldHint: 'Stem with four options',
  },
];

export const DEFAULT_TEMPLATE: ChatCardTemplate = 'basic';

interface ShapeCard {
  front: string;
  back: string;
  options?: string[];
  correctIndex?: number;
}

const CLOZE_MARKER = /\{\{c\d+::/;

function isMcqShape(card: ShapeCard): boolean {
  return Array.isArray(card.options) && typeof card.correctIndex === 'number';
}

function isClozeShape(card: ShapeCard): boolean {
  return CLOZE_MARKER.test(card.front);
}

function isBasicShape(card: ShapeCard): boolean {
  return (
    card.back.trim().length > 0 && !isMcqShape(card) && !isClozeShape(card)
  );
}

export const TRANSFORM_TEMPLATES: ReadonlySet<ChatCardTemplate> =
  new Set<ChatCardTemplate>(['basic', 'basic-and-reversed']);

export function isPureClientReshape(
  from: ChatCardTemplate,
  to: ChatCardTemplate
): boolean {
  return TRANSFORM_TEMPLATES.has(from) && TRANSFORM_TEMPLATES.has(to);
}

export function templateSwitchLabel(target: ChatCardTemplate): string {
  switch (target) {
    case 'cloze':
      return 'Switching to Cloze';
    case 'mcq':
      return 'Switching to multiple choice';
    case 'basic-and-reversed':
    case 'basic':
      return 'Switching to Basic';
  }
}

export function effectiveTemplateForCards(
  cards: ShapeCard[],
  selected: ChatCardTemplate
): ChatCardTemplate {
  if (cards.length === 0) return selected;
  if (cards.every(isMcqShape)) return 'mcq';
  if (cards.every(isClozeShape)) return 'cloze';
  if (cards.every(isBasicShape) && !TRANSFORM_TEMPLATES.has(selected))
    return 'basic';
  return selected;
}

const DECK_LINE = /^[ \t]*Deck:[ \t]*(.+?)[ \t]*$/im;
const EMPHASIS_EDGES = /^[*_`]+|[*_`]+$/g;

export function parseDeckName(text: string): string | null {
  if (typeof text !== 'string') return null;
  const match = DECK_LINE.exec(text);
  if (match == null) return null;
  const name = match[1].replace(EMPHASIS_EDGES, '').trim();
  return name.length > 0 ? name : null;
}

export function suggestDeckName(
  messageText: string,
  conversationTitle?: string | null
): string | null {
  const fromDeckLine = parseDeckName(messageText);
  if (fromDeckLine != null) return fromDeckLine;
  const title = conversationTitle?.trim();
  return title != null && title.length > 0 ? title : null;
}
