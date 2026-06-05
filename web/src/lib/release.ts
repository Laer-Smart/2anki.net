export function getClientRelease(
  raw: string | undefined = process.env.REACT_APP_RELEASE
): string | null {
  if (typeof raw !== 'string') {
    return null;
  }
  const trimmed = raw.trim();
  return trimmed === '' ? null : trimmed;
}
