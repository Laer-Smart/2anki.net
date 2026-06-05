export const FRONT_COLUMN_CANDIDATES = [
  'term',
  'word',
  'front',
  'question',
  'vocabulary',
];
export const BACK_COLUMN_CANDIDATES = [
  'definition',
  'meaning',
  'back',
  'answer',
  'translation',
];

export interface ColumnMapping {
  frontField: string | null;
  backField: string | null;
  ambiguous: boolean;
}

function matchByCandidates(
  columnNames: readonly string[],
  candidates: readonly string[]
): string[] {
  const lower = columnNames.map((c) => c.toLowerCase());
  return candidates
    .map((needle) => columnNames[lower.indexOf(needle)])
    .filter((c): c is string => c != null);
}

export function inferColumnMapping(
  columnNames: readonly string[]
): ColumnMapping {
  const frontMatches = matchByCandidates(columnNames, FRONT_COLUMN_CANDIDATES);
  const backMatches = matchByCandidates(columnNames, BACK_COLUMN_CANDIDATES);

  const frontField = frontMatches[0] ?? null;
  const backField = backMatches.find((c) => c !== frontField) ?? null;

  const ambiguous =
    frontField == null ||
    backField == null ||
    frontMatches.length > 1 ||
    backMatches.length > 1;

  return { frontField, backField, ambiguous };
}
