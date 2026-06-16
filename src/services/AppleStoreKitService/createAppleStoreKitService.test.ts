import fs from 'fs';

import {
  Environment,
  SignedDataVerifier,
} from '@apple/app-store-server-library';

import {
  createAppleStoreKitService,
  VERIFIED_ENVIRONMENTS,
} from './createAppleStoreKitService';

jest.mock('@apple/app-store-server-library', () => {
  const actual = jest.requireActual('@apple/app-store-server-library');
  return { ...actual, SignedDataVerifier: jest.fn() };
});

const MockedVerifier = SignedDataVerifier as unknown as jest.Mock;

function environmentsPassedToVerifiers(): Environment[] {
  return MockedVerifier.mock.calls.map((call) => call[2] as Environment);
}

describe('createAppleStoreKitService', () => {
  const original = { ...process.env };

  beforeEach(() => {
    MockedVerifier.mockClear();
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    jest
      .spyOn(fs, 'readdirSync')
      .mockReturnValue(['AppleRootCA-G3.cer'] as never);
    jest.spyOn(fs, 'readFileSync').mockReturnValue(Buffer.from('cert'));
    process.env.APPLE_IAP_BUNDLE_ID = 'net.2anki.app';
    process.env.APPLE_IAP_ROOT_CERTS_DIR = '/certs';
    process.env.APPLE_IAP_APP_APPLE_ID = '1234567890';
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.env = { ...original };
  });

  it('verifies against both Production and Sandbox when the env var is unset', () => {
    delete process.env.APPLE_IAP_ENVIRONMENT;

    createAppleStoreKitService();

    expect(environmentsPassedToVerifiers()).toEqual([
      Environment.PRODUCTION,
      Environment.SANDBOX,
    ]);
  });

  it('still builds a Production verifier when prod is misconfigured to Sandbox only', () => {
    process.env.APPLE_IAP_ENVIRONMENT = 'Sandbox';

    createAppleStoreKitService();

    expect(environmentsPassedToVerifiers()).toContain(Environment.PRODUCTION);
  });

  it('exposes both environments as the verified set', () => {
    expect(VERIFIED_ENVIRONMENTS).toEqual([
      Environment.PRODUCTION,
      Environment.SANDBOX,
    ]);
  });
});
