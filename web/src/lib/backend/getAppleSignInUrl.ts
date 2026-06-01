export const APPLE_CLIENT_ID = 'com.2anki.web';

export function getAppleSignInUrl() {
  const initUrl = new URL(
    '/api/users/auth/apple/init',
    globalThis.location?.href ?? 'https://2anki.net'
  ).toString();
  return initUrl;
}
