import { describe, expect, it } from 'vitest';

import { resolveSuccessOffer } from './resolveSuccessOffer';

const OFFER = { passCount: 3, spentUsd: 13 };

describe('resolveSuccessOffer', () => {
  it('offers account creation to anonymous users', () => {
    expect(
      resolveSuccessOffer({
        anonymous: true,
        paying: false,
        passLadder: null,
        passLadderShownOnPage: false,
      })
    ).toBe('anon_signup');
  });

  it('offers the pass ladder to eligible repeat buyers', () => {
    expect(
      resolveSuccessOffer({
        anonymous: false,
        paying: true,
        passLadder: OFFER,
        passLadderShownOnPage: false,
      })
    ).toBe('pass_ladder');
  });

  it('shows nothing when the pass ladder is already on the page', () => {
    expect(
      resolveSuccessOffer({
        anonymous: false,
        paying: true,
        passLadder: OFFER,
        passLadderShownOnPage: true,
      })
    ).toBeNull();
  });

  it('shows nothing to paying users without a ladder offer', () => {
    expect(
      resolveSuccessOffer({
        anonymous: false,
        paying: true,
        passLadder: null,
        passLadderShownOnPage: false,
      })
    ).toBeNull();
  });

  it('falls back to the pass upsell for logged-in free users', () => {
    expect(
      resolveSuccessOffer({
        anonymous: false,
        paying: false,
        passLadder: null,
        passLadderShownOnPage: false,
      })
    ).toBe('upsell');
  });
});
