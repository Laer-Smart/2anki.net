/**
 * Extract the GA4 client_id from the Google Analytics `_ga` cookie so it can
 * land in Stripe Checkout session metadata as `ga_client_id`. The webhook reads
 * it back to stitch the server-side `purchase` event to the user's GA session.
 *
 * The `_ga` cookie value looks like `GA1.1.1234567890.987654321`; GA4's
 * Measurement Protocol expects only the trailing `<random>.<timestamp>` pair as
 * the client_id, not the `GA1.1.` version/scope prefix. Anything that does not
 * match that shape returns undefined so nothing arbitrary reaches metadata.
 */
export function parseGaClientId(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const match = value.match(/^GA\d+\.\d+\.(\d+\.\d+)$/);
  return match ? match[1] : undefined;
}
