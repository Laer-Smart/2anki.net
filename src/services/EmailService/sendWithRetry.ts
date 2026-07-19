export interface SendRetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  sleepFn?: (ms: number) => Promise<void>;
}

const RETRYABLE_NETWORK_CODES = new Set<string>([
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'EAI_AGAIN',
  'ENOTFOUND',
  'EPIPE',
]);

// SendGrid surfaces HTTP failures as an error whose `code` is the numeric
// status (429 rate-limit, 5xx upstream); transport failures surface with a
// string `code` (ECONNRESET, …) and no HTTP response. Both are worth another
// attempt; a 4xx other than 429 is a permanent reject and must not retry.
export function isTransientSendError(error: unknown): boolean {
  const code = (error as { code?: unknown } | null | undefined)?.code;
  if (typeof code === 'number') {
    return code === 429 || code >= 500;
  }
  if (typeof code === 'string') {
    return RETRYABLE_NETWORK_CODES.has(code);
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Retry a single email send across transient SendGrid/transport failures with
// exponential backoff. Rethrows the last error when attempts are exhausted or
// the failure is permanent, so the caller still learns the send did not happen.
export async function sendWithRetry<T>(
  send: () => Promise<T>,
  options: SendRetryOptions = {}
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 500;
  const doSleep = options.sleepFn ?? sleep;

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await send();
    } catch (error) {
      lastError = error;
      if (attempt === maxAttempts || !isTransientSendError(error)) {
        throw error;
      }
      await doSleep(baseDelayMs * 2 ** (attempt - 1));
    }
  }
  throw lastError;
}
