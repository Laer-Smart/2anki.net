export class UserNotice extends Error {
  readonly code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = 'UserNotice';
    this.code = code;
    Object.setPrototypeOf(this, UserNotice.prototype);
  }
}

const INTENTIONAL_MESSAGE_SUBSTRINGS = [
  'notion is not connected',
  'api token is invalid',
  'an account with this email',
];

export function isIntentionalBackendNotice(
  message: string | null | undefined
): boolean {
  if (message == null) return false;
  const lower = message.toLowerCase();
  return INTENTIONAL_MESSAGE_SUBSTRINGS.some((s) => lower.includes(s));
}
