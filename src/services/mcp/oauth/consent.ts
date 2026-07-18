import crypto from 'crypto';

const CONSENT_TOKEN_CONTEXT = 'mcp-consent:v1:';

export function computeConsentToken(
  sessionToken: string,
  secret: string
): string {
  return crypto
    .createHmac('sha256', secret)
    .update(CONSENT_TOKEN_CONTEXT + sessionToken)
    .digest('hex');
}

export function consentTokenMatches(
  expected: string,
  submitted: unknown
): boolean {
  if (typeof submitted !== 'string' || submitted.length !== expected.length) {
    return false;
  }
  return crypto.timingSafeEqual(
    Buffer.from(expected, 'utf-8'),
    Buffer.from(submitted, 'utf-8')
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface ConsentPageInput {
  actionPath: string;
  clientName: string;
  scopes: string[];
  csrf: string;
  fields: Record<string, string | undefined>;
}

function hiddenInput(name: string, value: string): string {
  return `<input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(
    value
  )}" />`;
}

export function renderConsentPage(input: ConsentPageInput): string {
  const hidden = Object.entries(input.fields)
    .filter(([, value]) => value != null && value !== '')
    .map(([name, value]) => hiddenInput(name, value as string))
    .join('\n      ');
  const scopeList =
    input.scopes.length > 0
      ? input.scopes.map((scope) => `<li>${escapeHtml(scope)}</li>`).join('')
      : '<li>Access your 2anki decks and conversions</li>';
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Connect to 2anki</title>
  </head>
  <body style="font-family: system-ui, sans-serif; max-width: 480px; margin: 48px auto; padding: 0 16px;">
    <h1 style="font-size: 20px;">Connect ${escapeHtml(
      input.clientName
    )} to 2anki?</h1>
    <p>${escapeHtml(
      input.clientName
    )} is asking to access your 2anki account:</p>
    <ul>${scopeList}</ul>
    <form method="post" action="${escapeHtml(input.actionPath)}">
      ${hidden}
      ${hiddenInput('csrf', input.csrf)}
      <div style="display: flex; gap: 12px; margin-top: 24px;">
        <button type="submit" name="consent" value="approve" style="padding: 10px 16px;">Approve</button>
        <button type="submit" name="consent" value="deny" style="padding: 10px 16px;">Deny</button>
      </div>
    </form>
  </body>
</html>`;
}
