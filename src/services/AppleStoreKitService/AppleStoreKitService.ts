import {
  VerificationException,
  VerificationStatus,
} from '@apple/app-store-server-library';

export interface DecodedAppleTransaction {
  transactionId: string;
  productId: string;
  bundleId: string;
  environment: string;
  purchaseDateMs?: number;
  expiresDateMs?: number;
}

export interface JWSTransactionDecodedPayloadLike {
  transactionId?: string;
  productId?: string;
  bundleId?: string;
  environment?: string;
  purchaseDate?: number;
  expiresDate?: number;
}

export interface TransactionVerifier {
  verifyAndDecodeTransaction(
    signedTransaction: string
  ): Promise<JWSTransactionDecodedPayloadLike>;
}

export interface IAppleStoreKitService {
  verifyTransaction(jws: string): Promise<DecodedAppleTransaction>;
}

export class AppleVerificationError extends Error {
  constructor(message = 'Apple transaction failed verification') {
    super(message);
    this.name = 'AppleVerificationError';
  }
}

export class AppleUnavailableError extends Error {
  constructor(
    message = 'Apple App Store Server could not confirm the purchase'
  ) {
    super(message);
    this.name = 'AppleUnavailableError';
  }
}

export class AppleIapNotConfiguredError extends Error {
  constructor(message = 'Apple IAP verification is not configured') {
    super(message);
    this.name = 'AppleIapNotConfiguredError';
  }
}

function isWrongEnvironment(err: unknown): boolean {
  return (
    err instanceof VerificationException &&
    err.status === VerificationStatus.INVALID_ENVIRONMENT
  );
}

function classify(err: unknown): Error {
  if (err instanceof VerificationException) {
    if (err.status === VerificationStatus.RETRYABLE_VERIFICATION_FAILURE) {
      return new AppleUnavailableError();
    }
    return new AppleVerificationError();
  }
  return new AppleUnavailableError();
}

function mapDecoded(
  payload: JWSTransactionDecodedPayloadLike
): DecodedAppleTransaction {
  const { transactionId, productId, bundleId, environment } = payload;
  if (
    transactionId == null ||
    productId == null ||
    bundleId == null ||
    environment == null
  ) {
    throw new AppleVerificationError('Decoded transaction is missing fields');
  }
  return {
    transactionId,
    productId,
    bundleId,
    environment,
    purchaseDateMs: payload.purchaseDate,
    expiresDateMs: payload.expiresDate,
  };
}

export class AppleStoreKitService implements IAppleStoreKitService {
  constructor(private readonly verifiers: TransactionVerifier[]) {}

  async verifyTransaction(jws: string): Promise<DecodedAppleTransaction> {
    let lastError: unknown = new AppleVerificationError();
    for (const verifier of this.verifiers) {
      let payload: JWSTransactionDecodedPayloadLike;
      try {
        payload = await verifier.verifyAndDecodeTransaction(jws);
      } catch (err) {
        lastError = err;
        if (isWrongEnvironment(err)) {
          continue;
        }
        throw classify(err);
      }
      return mapDecoded(payload);
    }
    throw classify(lastError);
  }
}

export default AppleStoreKitService;
