export interface WithStripeRetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
}

function isStripeRateLimitError(error: unknown): boolean {
  return (error as { type?: string })?.type === 'StripeRateLimitError';
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withStripeRetry<T>(
  operation: () => Promise<T>,
  label: string,
  options: WithStripeRetryOptions = {}
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 5;
  const baseDelayMs = options.baseDelayMs ?? 1000;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === maxAttempts || !isStripeRateLimitError(error)) {
        throw error;
      }
      const delay = Math.floor(
        baseDelayMs * 2 ** (attempt - 1) * (0.5 + Math.random())
      );
      console.warn(
        `[${label}] rate limited; retrying in ${delay}ms (attempt ${attempt}/${maxAttempts})`
      );
      await sleep(delay);
    }
  }
  throw lastError;
}
