export interface FieldMapping {
  frontField: string;
  backField: string;
}

export interface AmbiguousColumnsPayload {
  columns: string[];
  suggested: {
    frontField: string | null;
    backField: string | null;
  };
}

export const COLUMNS_AMBIGUOUS_PREFIX = 'COLUMNS_AMBIGUOUS:';

export function parseAmbiguousColumnsPayload(
  jobReasonFailure: string | null
): AmbiguousColumnsPayload | null {
  if (jobReasonFailure == null) return null;
  if (!jobReasonFailure.startsWith(COLUMNS_AMBIGUOUS_PREFIX)) return null;
  try {
    const raw = jobReasonFailure.slice(COLUMNS_AMBIGUOUS_PREFIX.length);
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed !== 'object' ||
      parsed == null ||
      !Array.isArray((parsed as Record<string, unknown>).columns)
    ) {
      return null;
    }
    const p = parsed as {
      columns: unknown[];
      suggested?: { frontField?: unknown; backField?: unknown };
    };
    const columns = p.columns.filter(
      (c): c is string => typeof c === 'string'
    );
    const suggested = {
      frontField:
        typeof p.suggested?.frontField === 'string'
          ? p.suggested.frontField
          : null,
      backField:
        typeof p.suggested?.backField === 'string'
          ? p.suggested.backField
          : null,
    };
    return { columns, suggested };
  } catch {
    return null;
  }
}
