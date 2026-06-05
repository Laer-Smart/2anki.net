import fs from 'fs';
import path from 'path';

import {
  Environment,
  SignedDataVerifier,
} from '@apple/app-store-server-library';

import {
  AppleIapNotConfiguredError,
  AppleStoreKitService,
  type IAppleStoreKitService,
} from './AppleStoreKitService';

function loadRootCertificates(dir: string): Buffer[] {
  return fs
    .readdirSync(dir)
    .filter((file) => /\.(cer|der|pem|crt)$/i.test(file))
    .map((file) => fs.readFileSync(path.join(dir, file)));
}

const KNOWN_ENVIRONMENTS: Record<string, Environment> = {
  production: Environment.PRODUCTION,
  sandbox: Environment.SANDBOX,
};

export function parseAcceptedEnvironments(
  raw: string | undefined
): Environment[] {
  if (raw == null || raw === '') {
    return [Environment.PRODUCTION];
  }
  const seen = new Set<Environment>();
  for (const token of raw.split(',')) {
    const environment = KNOWN_ENVIRONMENTS[token.trim().toLowerCase()];
    if (environment != null) {
      seen.add(environment);
    }
  }
  return seen.size > 0 ? [...seen] : [Environment.PRODUCTION];
}

export function createAppleStoreKitService(): IAppleStoreKitService {
  const bundleId = process.env.APPLE_IAP_BUNDLE_ID;
  const rootCertsDir = process.env.APPLE_IAP_ROOT_CERTS_DIR;

  if (
    bundleId == null ||
    bundleId === '' ||
    rootCertsDir == null ||
    rootCertsDir === ''
  ) {
    throw new AppleIapNotConfiguredError(
      'Set APPLE_IAP_BUNDLE_ID and APPLE_IAP_ROOT_CERTS_DIR to enable IAP redemption'
    );
  }

  if (!fs.existsSync(rootCertsDir)) {
    throw new AppleIapNotConfiguredError(
      `Apple root certificate directory not found: ${rootCertsDir}`
    );
  }

  const rootCertificates = loadRootCertificates(rootCertsDir);
  if (rootCertificates.length === 0) {
    throw new AppleIapNotConfiguredError(
      `No Apple root certificates (.cer/.der/.pem) found in ${rootCertsDir}`
    );
  }

  const appAppleIdRaw = process.env.APPLE_IAP_APP_APPLE_ID;
  const appAppleId =
    appAppleIdRaw != null && appAppleIdRaw !== ''
      ? Number.parseInt(appAppleIdRaw, 10)
      : undefined;

  const enableOnlineChecks = true;
  const verifiers = parseAcceptedEnvironments(
    process.env.APPLE_IAP_ENVIRONMENT
  ).map(
    (environment) =>
      new SignedDataVerifier(
        rootCertificates,
        enableOnlineChecks,
        environment,
        bundleId,
        appAppleId
      )
  );

  return new AppleStoreKitService(verifiers);
}
