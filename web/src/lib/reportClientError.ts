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

    const payload: Record<string, unknown> = {
      message,
      source: 'web',
      userAgent: navigator.userAgent,
    };
    if (stack != null) payload.stack = stack;
    if (release != null) payload.release = release;
    if (context != null) payload.context = context;

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
