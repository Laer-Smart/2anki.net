import { UserNotice } from './errors/UserNotice';
import { isDomManipulationError } from './isDomManipulationError';
import { getClientRelease } from './release';

const ENDPOINT = '/api/events/errors';

const TRANSIENT_MESSAGE_PREFIXES = [
  'Failed to fetch',
  'NetworkError when attempting to fetch resource.',
  'Load failed',
  'Network error on ',
  'Unable to preload',
];

function isTransientNetworkMessage(message: string): boolean {
  return TRANSIENT_MESSAGE_PREFIXES.some((prefix) =>
    message.startsWith(prefix)
  );
}

function isAbortError(error: unknown): boolean {
  return (
    error != null &&
    typeof error === 'object' &&
    'name' in error &&
    (error as { name?: unknown }).name === 'AbortError'
  );
}

export function reportClientError(
  error: unknown,
  context?: Record<string, unknown>
): void {
  if (error instanceof UserNotice) return;
  if (isAbortError(error)) return;
  if (isDomManipulationError(error)) return;
  try {
    if (navigator.onLine === false) return;
    const message = error instanceof Error ? error.message : String(error);
    if (isTransientNetworkMessage(message)) return;
    const stack = error instanceof Error ? (error.stack ?? null) : null;
    const release = getClientRelease();
    const root = document.documentElement;
    const lang = root.lang || navigator.language || null;
    const translated =
      root.classList.contains('translated-ltr') ||
      root.classList.contains('translated-rtl');

    const payload: Record<string, unknown> = {
      message,
      source: 'web',
      url: window.location.href,
      userAgent: navigator.userAgent,
      context: { ...context, lang, translated },
    };
    if (stack != null) payload.stack = stack;
    if (release != null) payload.release = release;

    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {
      // fire-and-forget: swallow network failures
    });
  } catch {
    // Never let error reporting crash the session
  }
}
