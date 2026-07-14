import type {
  PassKind,
  IUserPassRepository,
} from '../../data_layer/UserPassRepository';
import {
  DuplicateAppleTransactionError,
  type IAppleTransactionsRepository,
} from '../../data_layer/AppleTransactionsRepository';
import {
  AppleUnavailableError,
  AppleVerificationError,
  type DecodedAppleTransaction,
  type IAppleStoreKitService,
} from '../../services/AppleStoreKitService';
import hashToken from '../../lib/misc/hashToken';
import { track } from '../../services/events/track';
import { IapRedeemError } from './IapRedeemError';
import { findAppleProduct, type SubscriptionProduct } from './products';

export interface RedeemAppleTransactionInput {
  userId: number;
  jws: string;
  productId: string;
}

export interface RedeemAppleTransactionResult {
  message: string;
  pass: { kind: PassKind; expiresAt: Date };
}

export class RedeemAppleTransactionUseCase {
  constructor(
    private readonly appleService: IAppleStoreKitService,
    private readonly userPassRepository: IUserPassRepository,
    private readonly appleTransactions: IAppleTransactionsRepository,
    private readonly now: () => Date = () => new Date()
  ) {}

  async execute(
    input: RedeemAppleTransactionInput
  ): Promise<RedeemAppleTransactionResult> {
    const decoded = await this.verify(input.jws);

    if (decoded.productId !== input.productId) {
      throw IapRedeemError.malformed();
    }

    const product = findAppleProduct(decoded.productId);
    if (product == null) {
      throw IapRedeemError.malformed();
    }

    const now = this.now();
    const idempotencyKey = `apple:${decoded.transactionId}`;
    const pass =
      product.kind === 'subscription'
        ? await this.grantSubscription(
            input.userId,
            product,
            decoded,
            idempotencyKey
          )
        : await this.userPassRepository.upsertWithExtension(
            input.userId,
            product.passKind,
            product.durationMs,
            idempotencyKey,
            now
          );

    const ledgerExpiresAt =
      decoded.expiresDateMs != null ? new Date(decoded.expiresDateMs) : null;

    try {
      await this.appleTransactions.record(
        {
          userId: input.userId,
          transactionId: decoded.transactionId,
          productId: decoded.productId,
          environment: decoded.environment,
          expiresAt: ledgerExpiresAt,
        },
        now
      );
    } catch (err) {
      if (err instanceof DuplicateAppleTransactionError) {
        throw IapRedeemError.duplicate();
      }
      throw err;
    }

    console.info('iap.redeem.granted', {
      user_id: input.userId,
      product_id: decoded.productId,
      kind: product.passKind,
      environment: decoded.environment,
      expires_at: pass.expires_at.toISOString(),
      transaction_id_hash: hashToken(decoded.transactionId),
    });

    track('native_app_activated', {
      userId: input.userId,
      props: {
        platform: 'apple',
        product_kind: product.kind,
        pass_kind: product.passKind,
        environment: decoded.environment,
      },
    });

    return {
      message: product.successMessage,
      pass: { kind: pass.kind, expiresAt: pass.expires_at },
    };
  }

  private grantSubscription(
    userId: number,
    product: SubscriptionProduct,
    decoded: DecodedAppleTransaction,
    idempotencyKey: string
  ) {
    if (decoded.expiresDateMs == null) {
      throw IapRedeemError.malformed();
    }
    return this.userPassRepository.upsertWithAbsoluteExpiry(
      userId,
      product.passKind,
      new Date(decoded.expiresDateMs),
      idempotencyKey
    );
  }

  private async verify(jws: string) {
    try {
      return await this.appleService.verifyTransaction(jws);
    } catch (err) {
      if (err instanceof AppleVerificationError) {
        throw IapRedeemError.malformed();
      }
      if (err instanceof AppleUnavailableError) {
        throw IapRedeemError.unavailable();
      }
      throw err;
    }
  }
}

export default RedeemAppleTransactionUseCase;
