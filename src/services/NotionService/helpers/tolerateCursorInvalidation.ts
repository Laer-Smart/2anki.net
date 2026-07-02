import { APIErrorCode, APIResponseError } from '@notionhq/client';

export function isStartCursorInvalidationError(error: unknown): boolean {
  return (
    error instanceof APIResponseError &&
    error.code === APIErrorCode.ValidationError &&
    error.message.includes('start_cursor')
  );
}

export async function fetchPageOrStopOnCursorInvalidation<T>(
  fetchPage: () => Promise<T>,
  hasCursor: boolean,
  label: string
): Promise<T | null> {
  try {
    return await fetchPage();
  } catch (error) {
    if (hasCursor && isStartCursorInvalidationError(error)) {
      console.info(
        `[notion] ${label}: start_cursor invalidated mid-pagination; returning results collected so far`
      );
      return null;
    }
    throw error;
  }
}
