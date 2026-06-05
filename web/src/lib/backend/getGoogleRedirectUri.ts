export function getGoogleRedirectUri() {
  const redirectUri = new URL(
    '/api/users/auth/google',
    globalThis.location.href
  ).toString();
  return redirectUri;
}
