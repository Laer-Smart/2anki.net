export class PricingResolutionError extends Error {
  constructor(public readonly lookupKey: string) {
    super(`Could not resolve an active price for lookup_key ${lookupKey}`);
    this.name = 'PricingResolutionError';
  }
}
