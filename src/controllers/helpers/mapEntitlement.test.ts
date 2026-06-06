import { mapEntitlement } from './mapEntitlement';

describe('mapEntitlement', () => {
  it('passes through an explicit Day Pass with the planSource set in locals', () => {
    expect(
      mapEntitlement({
        subscriber: true,
        passKind: '24h',
        passExpiresAt: '2026-06-07T00:00:00.000Z',
        planSource: null,
      })
    ).toEqual({
      passKind: '24h',
      passExpiresAt: '2026-06-07T00:00:00.000Z',
      planSource: null,
    });
  });

  it('maps an unlimited Apple pass to planSource apple', () => {
    expect(
      mapEntitlement({
        subscriber: true,
        passKind: 'unlimited',
        passExpiresAt: '2026-07-01T00:00:00.000Z',
        planSource: 'apple',
      })
    ).toEqual({
      passKind: 'unlimited',
      passExpiresAt: '2026-07-01T00:00:00.000Z',
      planSource: 'apple',
    });
  });

  it('treats a subscriber without an explicit pass kind as unlimited', () => {
    expect(mapEntitlement({ subscriber: true, planSource: 'stripe' })).toEqual({
      passKind: 'unlimited',
      passExpiresAt: null,
      planSource: 'stripe',
    });
  });

  it('returns all-null for a free user', () => {
    expect(mapEntitlement({})).toEqual({
      passKind: null,
      passExpiresAt: null,
      planSource: null,
    });
  });

  it('rejects an unrecognized passKind value', () => {
    expect(mapEntitlement({ passKind: 'gold' }).passKind).toBeNull();
  });

  it('rejects an unrecognized planSource value', () => {
    expect(mapEntitlement({ planSource: 'paypal' }).planSource).toBeNull();
  });

  it('treats an empty passExpiresAt string as null', () => {
    expect(mapEntitlement({ passExpiresAt: '' }).passExpiresAt).toBeNull();
  });
});
