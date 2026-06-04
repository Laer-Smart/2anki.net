export type GoogleApiKeyShape =
  | { valid: true; key: string }
  | { valid: false; reason: 'empty' | 'oauth-client-secret' | 'unrecognized'; key: string };

export function assertGoogleApiKeyShape(value: string | undefined | null): GoogleApiKeyShape {
  const key = (value ?? '').trim();
  if (key.length === 0) {
    return { valid: false, reason: 'empty', key };
  }
  if (key.startsWith('GOCSPX-')) {
    return { valid: false, reason: 'oauth-client-secret', key };
  }
  if (!key.startsWith('AIza')) {
    return { valid: false, reason: 'unrecognized', key };
  }
  return { valid: true, key };
}

export function describeGoogleApiKeyProblem(
  shape: Extract<GoogleApiKeyShape, { valid: false }>
): string {
  switch (shape.reason) {
    case 'empty':
      return 'REACT_APP_GOOGLE_API_KEY is empty.';
    case 'oauth-client-secret':
      return 'REACT_APP_GOOGLE_API_KEY starts with "GOCSPX-", which is the Google OAuth Client Secret format. The Picker requires a Google API key (starts with "AIza"). Refusing to use this value to avoid leaking the secret into the public JS bundle.';
    case 'unrecognized':
      return 'REACT_APP_GOOGLE_API_KEY does not start with "AIza" — this does not look like a Google API key. Picker calls will likely fail.';
  }
}
