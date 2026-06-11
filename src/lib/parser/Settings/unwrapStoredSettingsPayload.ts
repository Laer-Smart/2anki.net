function parseJsonColumn(value: unknown): unknown {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function unwrapStoredSettingsPayload(
  stored: unknown
): Record<string, string> {
  const parsed = parseJsonColumn(stored);
  if (!isPlainObject(parsed)) {
    return {};
  }
  if (isPlainObject(parsed.payload)) {
    return parsed.payload as Record<string, string>;
  }
  return parsed as Record<string, string>;
}
