import { Request, Response } from 'express';
import { resolvePricingForUser } from '../usecases/checkout/ResolvePricingForUserUseCase';

export interface PricingControllerContext {
  pricingV2On: boolean;
  getUserCreatedAt: (userId: number) => Promise<Date | null>;
}

class PricingController {
  constructor(private readonly context: PricingControllerContext) {}

  async getPrices(_req: Request, res: Response): Promise<void> {
    const userId = res.locals.owner as number | undefined;
    const createdAt =
      userId == null ? null : await this.context.getUserCreatedAt(userId);

    const pricing = resolvePricingForUser({
      flagOn: this.context.pricingV2On,
      createdAt,
      now: new Date(),
    });

    res.json({
      cohort: pricing.cohort,
      legacy: pricing.cohort === 'legacy',
      monthly: { cents: pricing.monthlyCents },
      annual: { cents: pricing.annualCents },
      lockInDeadline: pricing.lockInDeadline,
    });
  }
}

export default PricingController;
