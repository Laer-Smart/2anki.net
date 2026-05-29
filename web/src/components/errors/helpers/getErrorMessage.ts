import { stripHtmlTags } from '../../../lib/text/stripHtmlTags';
import type { UploadErrorBody } from '../../../types/UploadErrorBody';

export type ErrorHandlerType = (error: unknown) => void;

interface FriendlyError {
  title: string;
  detail?: string;
  actionLink?: { text: string; to: string };
}

const FALLBACK: FriendlyError = {
  title: 'Something went wrong.',
  detail: 'Try again. If the problem keeps happening, email support@2anki.net.',
};

const UPLOAD_FALLBACK: FriendlyError = {
  title: 'Something broke while reading this file.',
  detail: 'Try again, or send the file to support@2anki.net so we can fix the parser.',
};

function toText(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    const m = (error as { message?: unknown }).message;
    if (typeof m === 'string') return m;
  }
  return '';
}

const NOTION_UNAUTHORIZED: FriendlyError = {
  title: 'Your Notion connection expired',
  detail: 'Reconnect to keep converting pages directly.',
  actionLink: { text: 'Reconnect Notion', to: '/notion' },
};

function isNotionUnauthorized(error: unknown): boolean {
  if (error != null && typeof error === 'object' && 'code' in error) {
    return (error as { code: unknown }).code === 'notion_unauthorized';
  }
  const raw = toText(error).toLowerCase();
  return raw.includes('api token is invalid');
}

export function classifyError(error: unknown): FriendlyError {
  if (isNotionUnauthorized(error)) return NOTION_UNAUTHORIZED;

  const raw = toText(error);

  if (!raw) return FALLBACK;

  const lower = raw.toLowerCase();

  if (
    error instanceof TypeError ||
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('load failed')
  ) {
    return {
      title: "Couldn't reach 2anki.",
      detail: 'Check your connection and try again.',
    };
  }

  if (
    lower.includes('econnreset') ||
    lower.includes('etimedout') ||
    lower.includes('econnrefused') ||
    lower.includes('gateway_timeout') ||
    lower.includes('service_unavailable')
  ) {
    return {
      title: 'The service is unreachable right now.',
      detail: 'This is usually temporary — try again in a moment.',
    };
  }

  if (lower.includes('rate_limited') || lower.includes('429')) {
    return {
      title: 'Too many requests.',
      detail:
        'Try again in a minute.',
    };
  }

  if (
    lower.includes('unauthorized') ||
    lower.includes('401') ||
    lower.includes('authentication required')
  ) {
    return {
      title: 'Session expired.',
      detail: 'Sign in again to continue.',
      actionLink: { text: 'Sign in', to: '/login' },
    };
  }

  if (lower.includes('object_not_found') || lower.includes('404')) {
    return {
      title: "Couldn't find that page.",
      detail:
        'It may have been deleted in Notion, or access was revoked. Try reconnecting or choosing a different page.',
    };
  }

  if (lower.includes('upload_limit') || lower.includes('upload limit')) {
    return {
      title: "You've reached your monthly limit.",
      detail: 'Upgrade your plan to convert more decks this month.',
    };
  }

  const stripped = stripHtmlTags(raw);
  if (stripped.length > 0 && stripped.length < 280) {
    return { title: stripped };
  }

  return FALLBACK;
}

export const getErrorMessage = (error: unknown): string => {
  const friendly = classifyError(error);
  return friendly.detail
    ? `${friendly.title} ${friendly.detail}`
    : friendly.title;
};

const PER_CODE_COPY: Partial<Record<UploadErrorBody['code'], FriendlyError>> = {
  unsupported_format: {
    title: "This file type isn't supported.",
    detail: 'Use .zip, .html, .md, .pdf, .docx, .xlsx, .pptx, or .csv.',
  },
  too_large: {
    title: 'This export is too large to convert in one go.',
    detail: 'Split it into smaller Notion subpages and convert each one separately.',
  },
  password_protected_pdf: {
    title: 'This PDF is password-protected.',
    detail: 'Remove the password in your PDF reader, save a copy, and upload that.',
  },
  invalid_markup: {
    title: "Part of this file has formatting we couldn't read.",
    detail: 'Open the source, remove or simplify the block that broke, and try again.',
  },
  malformed_notion: {
    title: "This Notion export couldn't be parsed.",
    detail: 'Re-export the page from Notion and try again.',
  },
  corrupted_apkg: {
    title: 'This .apkg file is damaged.',
    detail: 'Re-export it from Anki, or send it to support@2anki.net.',
  },
  empty_export: {
    title: 'This export has no content we can turn into cards.',
    detail: 'Check the page has text or toggle blocks, then export again.',
  },
  markdown_likely_lossy: {
    title: 'Notion Markdown exports flatten toggles — re-export this page as HTML and the toggles become flashcards.',
  },
  claude_parse_failed: {
    title: 'Something went wrong while making your cards.',
    detail: 'Try again — if it keeps happening, email support@2anki.net.',
  },
  parser_crash: {
    title: "Couldn't read this file.",
    detail: "It may be malformed or use a structure we don't recognise yet. Try re-exporting from the source app, or send the file to support@2anki.net.",
  },
  worker_timeout: {
    title: 'This conversion took longer than the time budget.',
    detail: 'Try splitting the file into smaller pieces, or remove very large embedded images.',
  },
  notion_rate_limit: {
    title: 'Notion is rate-limiting us right now.',
    detail: 'Wait a minute and convert again.',
  },
  notion_object_not_found: {
    title: "We couldn't open that Notion page.",
    detail: 'Share it with the 2anki integration in Notion, then try again.',
  },
  apkg_too_large_for_anki: {
    title: "This deck is over Anki's upload limit.",
    detail: 'Split it by toggling fewer pages, or upload directly to Anki desktop.',
  },
  zip_invalid: {
    title: "Couldn't read this zip.",
    detail: "Make sure it's the Markdown & CSV export from Notion, not the HTML export.",
  },
};

export function classifyUploadError(body: UploadErrorBody): FriendlyError {
  const perCode = PER_CODE_COPY[body.code];
  if (perCode) return perCode;
  const stripped = stripHtmlTags(body.message);
  if (stripped.length > 0 && stripped.length < 280) {
    return { title: stripped };
  }
  return UPLOAD_FALLBACK;
}
