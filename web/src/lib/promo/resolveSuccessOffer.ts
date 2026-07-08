export type SuccessOfferKind = 'anon_signup' | 'pass_ladder' | 'upsell';

export interface SuccessOfferContext {
  anonymous: boolean;
  paying: boolean;
  passLadder: { passCount: number; spentUsd: number } | null | undefined;
  passLadderShownOnPage: boolean;
}

export function resolveSuccessOffer(
  context: SuccessOfferContext
): SuccessOfferKind | null {
  if (context.anonymous) {
    return 'anon_signup';
  }
  if (context.passLadder != null) {
    return context.passLadderShownOnPage ? null : 'pass_ladder';
  }
  if (context.paying) {
    return null;
  }
  return 'upsell';
}
