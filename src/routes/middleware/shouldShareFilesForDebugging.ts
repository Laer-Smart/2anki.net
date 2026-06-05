export const SHARE_FILES_FOR_DEBUGGING_KEY = 'share-files-for-debugging';

export function shouldShareFilesForDebugging(body: unknown): boolean {
  if (body == null || typeof body !== 'object') return false;
  const value = (body as Record<string, unknown>)[
    SHARE_FILES_FOR_DEBUGGING_KEY
  ];
  return value === 'true' || value === true;
}
