export const FIRST_TOUCH_COOKIE = 'first_touch';

const MAX_AGE_SECONDS = 30 * 60;

function hasFirstTouch(cookieHeader: string): boolean {
  return cookieHeader
    .split(';')
    .some((entry) => entry.trim().startsWith(`${FIRST_TOUCH_COOKIE}=`));
}

function referrerHostname(referrer: string): string {
  try {
    return new URL(referrer).hostname;
  } catch {
    return '';
  }
}

export function buildFirstTouchCookie(
  cookieHeader: string,
  pathname: string,
  referrer: string
): string | null {
  if (hasFirstTouch(cookieHeader)) {
    return null;
  }
  const payload = JSON.stringify({
    landingPath: pathname,
    referrer: referrerHostname(referrer),
  });
  const value = encodeURIComponent(payload);
  return `${FIRST_TOUCH_COOKIE}=${value}; Max-Age=${MAX_AGE_SECONDS}; Path=/; SameSite=Lax`;
}

interface FirstTouchDocument {
  cookie: string;
  referrer: string;
  location: { pathname: string };
}

export function captureFirstTouch(
  doc: FirstTouchDocument | null = typeof document === 'undefined'
    ? null
    : document
): void {
  if (doc == null) {
    return;
  }
  const next = buildFirstTouchCookie(
    doc.cookie,
    doc.location.pathname,
    doc.referrer
  );
  if (next == null) {
    return;
  }
  doc.cookie = next;
}
