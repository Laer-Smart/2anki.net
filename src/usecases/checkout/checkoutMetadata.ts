/**
 * Build the optional half of a Stripe Checkout session's metadata: keep only
 * the entries whose value is present (not null/undefined and not the empty
 * string). Every checkout use case stamps the same attribution fields
 * (pricing_variant, anon_id, surface, ga_client_id) this way, so the rule for
 * "is this value worth storing?" lives in one place.
 */
export function optionalMetadata(
  entries: Record<string, string | undefined>
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(entries)) {
    if (value != null && value !== '') {
      result[key] = value;
    }
  }
  return result;
}
