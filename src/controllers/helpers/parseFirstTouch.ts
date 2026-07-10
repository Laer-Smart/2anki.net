export interface FirstTouchAttribution {
  signupOrigin: string | null;
  signupReferrer: string | null;
}

const PATH_MAX_LENGTH = 200;
const HOST_MAX_LENGTH = 100;
const HOST_PATTERN = /^[a-z0-9.-]+$/;

const EMPTY: FirstTouchAttribution = {
  signupOrigin: null,
  signupReferrer: null,
};

const PATH_PATTERN = /^\/[a-zA-Z0-9\-_/]{0,199}$/;

function sanitizeLandingPath(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  if (value.length === 0 || value.length > PATH_MAX_LENGTH) {
    return null;
  }
  if (!PATH_PATTERN.test(value)) {
    return null;
  }
  return value;
}

function sanitizeReferrerHost(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const host = value.toLowerCase();
  if (host.length === 0 || host.length > HOST_MAX_LENGTH) {
    return null;
  }
  if (!HOST_PATTERN.test(host)) {
    return null;
  }
  return host;
}

export function parseFirstTouch(raw: unknown): FirstTouchAttribution {
  if (typeof raw !== 'string') {
    return EMPTY;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return EMPTY;
  }
  if (parsed == null || typeof parsed !== 'object') {
    return EMPTY;
  }
  const record = parsed as Record<string, unknown>;
  return {
    signupOrigin: sanitizeLandingPath(record.landingPath),
    signupReferrer: sanitizeReferrerHost(record.referrer),
  };
}
