import { APIErrorCode, APIResponseError } from '@notionhq/client';

import type { UploadErrorBody } from '../../types/UploadErrorBody';

export interface NotionUploadError {
  status: number;
  body: UploadErrorBody;
}

const NOTION_UPLOAD_ERRORS: Partial<Record<APIErrorCode, NotionUploadError>> = {
  [APIErrorCode.Unauthorized]: {
    status: 401,
    body: {
      code: 'notion_unauthorized',
      message: 'Your Notion connection expired. Reconnect Notion and try again.',
    },
  },
  [APIErrorCode.ObjectNotFound]: {
    status: 404,
    body: {
      code: 'notion_object_not_found',
      message:
        "We couldn't open that Notion page. Share it with the 2anki integration in Notion, then try again.",
    },
  },
  [APIErrorCode.RateLimited]: {
    status: 429,
    body: {
      code: 'notion_rate_limit',
      message: 'Notion is rate-limiting us right now. Wait a minute and convert again.',
    },
  },
};

export function toNotionUploadError(error: unknown): NotionUploadError | null {
  if (error instanceof APIResponseError) {
    return NOTION_UPLOAD_ERRORS[error.code] ?? null;
  }
  return null;
}
