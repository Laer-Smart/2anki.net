export const IAP_ERROR_MESSAGES = {
  malformed:
    "We couldn't read this purchase. You weren't charged — try the purchase again.",
  duplicate:
    'This pass is already active on your account — nothing more to do.',
  unavailable:
    "Apple couldn't confirm this purchase. If you were charged, it'll be credited automatically — or contact support@2anki.net.",
} as const;

export class IapRedeemError extends Error {
  constructor(
    readonly status: number,
    readonly userMessage: string
  ) {
    super(userMessage);
    this.name = 'IapRedeemError';
  }

  static malformed(): IapRedeemError {
    return new IapRedeemError(400, IAP_ERROR_MESSAGES.malformed);
  }

  static duplicate(): IapRedeemError {
    return new IapRedeemError(409, IAP_ERROR_MESSAGES.duplicate);
  }

  static unavailable(): IapRedeemError {
    return new IapRedeemError(502, IAP_ERROR_MESSAGES.unavailable);
  }
}
