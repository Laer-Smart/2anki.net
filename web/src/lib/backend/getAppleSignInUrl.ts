export const APPLE_SERVICES_ID = 'com.2anki.web';

export function getAppleRedirectUri() {
  return new URL('/api/users/auth/apple', globalThis.location?.href ?? 'https://2anki.net').toString();
}

export function getAppleSignInUrl() {
  const initUrl = new URL(
    '/api/users/auth/apple/init',
    globalThis.location?.href ?? 'https://2anki.net'
  ).toString();
  return initUrl;
}
