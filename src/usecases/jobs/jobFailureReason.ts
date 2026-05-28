import { APIResponseError, APIErrorCode } from '@notionhq/client';
import { PythonExitError } from '../../lib/anki/buildPythonExitError';
import { EmptyDeckError } from './EmptyDeckError';
import { inferColumnMapping } from '../../lib/notionDatabase/inferColumnMapping';

export const NOTION_TOKEN_EXPIRED_REASON =
  'notion_token_expired';

export const EMPTY_DECK_FAILURE_REASON =
  "No cards in this deck yet. 2anki turns Notion toggle blocks into flashcards — the toggle title becomes the question, what's inside is the answer. Wrap your key terms in toggles in Notion, then convert again.";

export const COLUMNS_AMBIGUOUS_PREFIX = 'COLUMNS_AMBIGUOUS:';

export function isColumnsAmbiguousError(
  error: unknown
): error is Error & { code: string; columns: string[] } {
  return (
    error instanceof Error &&
    (error as Error & { code?: string }).code ===
      'NOTION_DATABASE_COLUMNS_AMBIGUOUS' &&
    Array.isArray((error as Error & { columns?: unknown }).columns)
  );
}

function buildColumnsAmbiguousReason(columns: string[]): string {
  const inferred = inferColumnMapping(columns);
  const payload = {
    columns,
    suggested: {
      frontField: inferred.frontField,
      backField: inferred.backField,
    },
  };
  return `${COLUMNS_AMBIGUOUS_PREFIX}${JSON.stringify(payload)}`;
}

export function isNotionUnauthorizedError(error: unknown): boolean {
  return (
    error instanceof APIResponseError &&
    error.code === APIErrorCode.Unauthorized
  );
}

function genericFailureReason(jobId = 'unavailable'): string {
  return `Something went wrong on our end converting this page. Email support@2anki.net with job ID ${jobId} and we'll take a look.`;
}

export function jobFailureReasonFromError(
  error: unknown,
  jobId?: string
): string {
  if (error instanceof EmptyDeckError) {
    return EMPTY_DECK_FAILURE_REASON;
  }
  if (error instanceof PythonExitError) {
    return error.message;
  }
  if (isColumnsAmbiguousError(error)) {
    return buildColumnsAmbiguousReason(error.columns);
  }
  if (isNotionUnauthorizedError(error)) {
    return NOTION_TOKEN_EXPIRED_REASON;
  }
  if (
    error instanceof Error &&
    /^pdfinfo_(failed|spawn_failed)/.test(error.message)
  ) {
    return 'We could not read this PDF. It may be corrupted, password-protected, or an unsupported variant. Try re-exporting the PDF or splitting it into smaller files.';
  }
  return genericFailureReason(jobId);
}
