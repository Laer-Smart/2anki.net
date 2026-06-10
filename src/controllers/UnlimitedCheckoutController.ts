import { Request, Response } from 'express';
import {
  UnlimitedCheckoutUseCase,
  UnlimitedInterval,
} from '../usecases/checkout/UnlimitedCheckoutUseCase';
import { parsePricingVariant } from '../usecases/checkout/pricingVariant';
import { parseCheckoutSurface } from '../usecases/checkout/checkoutSurface';
import { parseGaClientId } from '../usecases/checkout/gaClientId';
import type { EventsSink } from '../services/events/EventsSink';

const VALID_INTERVALS: ReadonlySet<string> = new Set(['month', 'year']);

export interface UnlimitedCheckoutContext {
  pricingV2On: boolean;
  getUserCreatedAt: (userId: number) => Promise<Date | null>;
}

class UnlimitedCheckoutController {
  constructor(
    private readonly useCase: UnlimitedCheckoutUseCase,
    private readonly context: UnlimitedCheckoutContext,
    private readonly eventsSink: Pick<EventsSink, 'record'>
  ) {}

  async createSession(req: Request, res: Response): Promise<void> {
    const interval = req.body?.interval;
    if (typeof interval !== 'string' || !VALID_INTERVALS.has(interval)) {
      res.status(400).json({ message: 'interval must be "month" or "year"' });
      return;
    }

    const userId = res.locals.owner as number;
    const userEmail = res.locals.email as string;
    const anonId = (req.cookies?.anon_id as string | undefined) ?? undefined;
    const gaClientId = parseGaClientId(req.cookies?._ga);
    const createdAt = await this.context.getUserCreatedAt(userId);

    const result = await this.useCase.execute({
      userId,
      userEmail,
      interval: interval as UnlimitedInterval,
      variant: parsePricingVariant(req.body?.variant),
      anonId,
      surface: parseCheckoutSurface(req.body?.surface),
      gaClientId,
      pricingV2On: this.context.pricingV2On,
      createdAt,
    });

    this.eventsSink.record({
      name: 'checkout_started',
      user_id: userId,
      props: {
        plan: 'unlimited',
        interval,
        cohort: result.cohort,
      },
    });

    res.json({ url: result.url });
  }
}

export default UnlimitedCheckoutController;
