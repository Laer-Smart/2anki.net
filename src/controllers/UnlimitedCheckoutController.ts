import { Request, Response } from 'express';
import { UnlimitedCheckoutUseCase, UnlimitedInterval } from '../usecases/checkout/UnlimitedCheckoutUseCase';
import { parsePricingVariant } from '../usecases/checkout/pricingVariant';

const VALID_INTERVALS: ReadonlySet<string> = new Set(['month', 'year']);

class UnlimitedCheckoutController {
  constructor(private readonly useCase: UnlimitedCheckoutUseCase) {}

  async createSession(req: Request, res: Response): Promise<void> {
    const interval = req.body?.interval;
    if (typeof interval !== 'string' || !VALID_INTERVALS.has(interval)) {
      res.status(400).json({ message: 'interval must be "month" or "year"' });
      return;
    }

    const userId = res.locals.owner as number;
    const userEmail = res.locals.email as string;

    const result = await this.useCase.execute({
      userId,
      userEmail,
      interval: interval as UnlimitedInterval,
      variant: parsePricingVariant(req.body?.variant),
    });
    res.json(result);
  }
}

export default UnlimitedCheckoutController;
