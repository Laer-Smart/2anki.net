export const REQUIRED_MCQ_OPTION_COUNT = 4;

export interface VerbatimCard {
  q: string;
  a: string;
  tags?: string[];
  cloze?: boolean;
  options?: unknown;
  correct_index?: unknown;
  rationale?: unknown;
}

export interface ValidMcqShape {
  options: string[];
  correctIndex: number;
  rationale: string;
}

export type VerbatimShape = 'mcq' | 'cloze' | 'basic';

const CLOZE_MARKER = /\{\{c\d+::/;

export function asValidMcq(card: VerbatimCard): ValidMcqShape | null {
  if (!Array.isArray(card.options)) return null;
  if (card.options.length !== REQUIRED_MCQ_OPTION_COUNT) return null;
  if (
    !card.options.every(
      (opt): opt is string => typeof opt === 'string' && opt.trim().length > 0
    )
  ) {
    return null;
  }
  if (
    typeof card.correct_index !== 'number' ||
    !Number.isInteger(card.correct_index)
  ) {
    return null;
  }
  if (card.correct_index < 0 || card.correct_index >= card.options.length) {
    return null;
  }
  const rationale = typeof card.rationale === 'string' ? card.rationale : '';
  return { options: card.options, correctIndex: card.correct_index, rationale };
}

export function looksLikeMcqAttempt(card: VerbatimCard): boolean {
  return card.options !== undefined || card.correct_index !== undefined;
}

function hasClozeMarkers(card: VerbatimCard): boolean {
  return CLOZE_MARKER.test(card.q) || CLOZE_MARKER.test(card.a);
}

export function classifyVerbatimShape(card: VerbatimCard): VerbatimShape {
  if (asValidMcq(card) != null) return 'mcq';
  if (card.cloze === true || hasClozeMarkers(card)) return 'cloze';
  return 'basic';
}
