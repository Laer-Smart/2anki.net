import type { Request, Response } from 'express';
import type { ClaimSubscriptionUseCase } from '../usecases/subscriptions/ClaimSubscriptionUseCase';
import type { ConfirmSubscriptionClaimUseCase } from '../usecases/subscriptions/ConfirmSubscriptionClaimUseCase';
import { emailHash } from '../lib/emailHash';
import hashToken from '../lib/misc/hashToken';
import { resolveClientIp } from '../lib/rateLimit/ipHelpers';

export class SubscriptionClaimController {
  constructor(
    private readonly claimUseCase: ClaimSubscriptionUseCase,
    private readonly confirmUseCase: ConfirmSubscriptionClaimUseCase
  ) {}

  async initiate(req: Request, res: Response): Promise<void> {
    const userId = res.locals.owner as number;
    const submittedEmail: string = (req.body?.email ?? '').trim().toLowerCase();

    if (!submittedEmail.includes('@')) {
      res.status(400).json({ message: 'Invalid email address.' });
      return;
    }

    const ip = resolveClientIp(req);
    const result = await this.claimUseCase.execute({
      userId,
      submittedEmail,
      ipHash: hashToken(ip),
      emailHash: emailHash(submittedEmail),
    });

    res.status(200).json({ message: result.message });
  }

  async confirm(req: Request, res: Response): Promise<void> {
    const userId = res.locals.owner as number;
    const rawToken: string = (req.body?.token ?? '').trim();

    if (!rawToken) {
      res.status(400).json({ message: 'Token is required.' });
      return;
    }

    const ip = resolveClientIp(req);
    const ipHashValue = hashToken(ip);
    const placeholderEmailHash = hashToken('unknown');

    const outcome = await this.confirmUseCase.execute(
      userId,
      rawToken,
      ipHashValue,
      placeholderEmailHash
    );

    if (outcome.success) {
      res.status(200).json({ message: 'Subscription claimed.' });
      return;
    }

    if (outcome.reason === 'already_consumed') {
      res.status(409).json({
        message: 'This link is already used. Sign in and try again from /account if you need to reclaim.',
      });
      return;
    }

    if (outcome.reason === 'user_has_active_sub') {
      res.status(409).json({
        message: 'This account already has an active subscription. Cancel it first or contact support.',
      });
      return;
    }

    res.status(400).json({ message: 'Invalid or expired confirmation link. Start over from /account.' });
  }
}
