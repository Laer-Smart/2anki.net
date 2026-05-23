export type BlockDecision = 'card' | 'skip' | 'recurse';

export interface ClassifyInput {
  type: string;
  hasToggleableHeading?: boolean;
}

export interface ClassifyRules {
  flashcardTypes: string[];
}

const HEADING_TYPES = new Set([
  'heading_1',
  'heading_2',
  'heading_3',
  'heading_4',
]);

export function classifyBlock(
  input: ClassifyInput,
  rules: ClassifyRules
): BlockDecision {
  const { type, hasToggleableHeading } = input;
  const { flashcardTypes } = rules;

  if (type === 'child_page') {
    return 'recurse';
  }

  if (flashcardTypes.includes(type)) {
    return 'card';
  }

  if (
    hasToggleableHeading === true &&
    HEADING_TYPES.has(type) &&
    flashcardTypes.includes('toggle')
  ) {
    return 'card';
  }

  return 'skip';
}
