export function getMicrosoftRedirectUri() {
  const redirectUri = new URL(
    '/api/users/auth/microsoft',
    globalThis.location.href
  ).toString();
  return redirectUri;
}
