export type ChatCardTemplate =
  | 'basic'
  | 'basic-and-reversed'
  | 'cloze'
  | 'mcq';

export interface ChatTemplateOption {
  slug: ChatCardTemplate;
  label: string;
  fieldHint: string;
}

export const CHAT_TEMPLATE_OPTIONS: ChatTemplateOption[] = [
  { slug: 'basic', label: 'Basic', fieldHint: 'Front / Back' },
  { slug: 'basic-and-reversed', label: 'Basic + Reverse', fieldHint: 'Front / Back (both directions)' },
  { slug: 'cloze', label: 'Cloze', fieldHint: 'Front with {{c1::blanks}}' },
  { slug: 'mcq', label: 'Multiple choice', fieldHint: 'Stem with four options' },
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

export function effectiveTemplateForCards(
  cards: ShapeCard[],
  selected: ChatCardTemplate
): ChatCardTemplate {
  if (cards.length === 0) return selected;
  if (cards.every(isMcqShape)) return 'mcq';
  if (cards.every(isClozeShape)) return 'cloze';
  return selected;
}
