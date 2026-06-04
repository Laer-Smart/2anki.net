import { UserNotice } from './errors/UserNotice';

const ENDPOINT = '/api/events/errors';

export function reportClientError(
  error: unknown,
  context?: Record<string, unknown>
): void {
  if (error instanceof UserNotice) return;
  try {
    const message =
      error instanceof Error
        ? error.message
        : String(error);
    const stack = error instanceof Error ? error.stack ?? null : null;
    const release = process.env.REACT_APP_RELEASE ?? null;
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
