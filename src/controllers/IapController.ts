import { Request, Response } from 'express';

import type { PassKind } from '../data_layer/UserPassRepository';
import { RedeemAppleTransactionUseCase } from '../usecases/iap/RedeemAppleTransactionUseCase';
import { IapRedeemError } from '../usecases/iap/IapRedeemError';

interface SubscriptionInfo {
  active: boolean;
  email: string;
  linked_email: string;
}

interface IapLocals {
  owner: number;
  patreon: boolean;
  subscriber: boolean;
  subscriptionInfo: SubscriptionInfo;
  passExpiresAt: string | null;
  passKind: PassKind | null;
}

function readString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }
  return null;
}

class IapController {
  constructor(private readonly useCase: RedeemAppleTransactionUseCase) {}

  async redeem(req: Request, res: Response): Promise<void> {
    const userId = res.locals.owner as number;
    const body = (req.body ?? {}) as Record<string, unknown>;
    const jws = readString(
      body.jws,
      body.signedTransaction,
      body.signed_transaction_info
    );
    const productId = readString(body.product_id, body.productId);

    if (jws == null || productId == null) {
      this.fail(res, IapRedeemError.malformed());
      return;
    }

    try {
      const result = await this.useCase.execute({ userId, jws, productId });
      res.status(200).json({
        ok: true,
        message: result.message,
        locals: this.buildLocals(res, result.pass),
      });
    } catch (err) {
      if (err instanceof IapRedeemError) {
        this.fail(res, err);
        return;
      }
      throw err;
    }
  }

  private fail(res: Response, error: IapRedeemError): void {
    console.warn('iap.redeem.failed', { status: error.status });
    res.status(error.status).json({ ok: false, message: error.userMessage });
  }

  private buildLocals(
    res: Response,
    pass: { kind: PassKind; expiresAt: Date }
  ): IapLocals {
    const subscriptionInfo = (res.locals.subscriptionInfo as
      | SubscriptionInfo
      | undefined) ?? {
      active: false,
      email: '',
      linked_email: '',
    };
    return {
      owner: res.locals.owner as number,
      patreon: Boolean(res.locals.patreon),
      subscriber: true,
      subscriptionInfo,
      passExpiresAt: pass.expiresAt.toISOString(),
      passKind: pass.kind,
    };
  }
}

export default IapController;
