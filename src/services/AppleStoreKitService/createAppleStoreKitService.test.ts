import { Environment } from '@apple/app-store-server-library';

import { parseAcceptedEnvironments } from './createAppleStoreKitService';

describe('parseAcceptedEnvironments', () => {
  it('defaults to Production only when unset', () => {
    expect(parseAcceptedEnvironments(undefined)).toEqual([
      Environment.PRODUCTION,
    ]);
  });

  it('defaults to Production only for an empty string', () => {
    expect(parseAcceptedEnvironments('')).toEqual([Environment.PRODUCTION]);
  });

  it('accepts a single named environment case-insensitively', () => {
    expect(parseAcceptedEnvironments('sandbox')).toEqual([Environment.SANDBOX]);
  });

  it('accepts both environments when listed', () => {
    expect(parseAcceptedEnvironments('Production, Sandbox')).toEqual([
      Environment.PRODUCTION,
      Environment.SANDBOX,
    ]);
  });

  it('ignores unknown tokens and falls back to Production', () => {
    expect(parseAcceptedEnvironments('xcode, nonsense')).toEqual([
      Environment.PRODUCTION,
    ]);
  });
});
