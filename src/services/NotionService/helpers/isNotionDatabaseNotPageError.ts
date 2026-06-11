export function isNotionDatabaseNotPageError(error: unknown): boolean {
  if (error == null || typeof error !== 'object') {
    return false;
  }
  const { code, message } = error as { code?: unknown; message?: unknown };
  return (
    code === 'validation_error' &&
    typeof message === 'string' &&
    message.includes('is a database, not a page')
  );
}
