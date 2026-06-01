const MAX_SURFACE_LENGTH = 40;

/**
 * Bound the surface/ref attribution string before it lands in Stripe session
 * metadata: lowercase, strip anything outside [a-z0-9_-], cap the length, and
 * reject empty input so nothing arbitrary or unbounded is stored.
 */
export function parseCheckoutSurface(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, MAX_SURFACE_LENGTH);
  return cleaned === '' ? undefined : cleaned;
}
