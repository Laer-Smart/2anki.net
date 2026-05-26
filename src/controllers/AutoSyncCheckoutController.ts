import { Request, Response } from 'express';
import { AutoSyncCheckoutUseCase } from '../usecases/checkout/AutoSyncCheckoutUseCase';
import { parsePricingVariant } from '../usecases/checkout/pricingVariant';

class AutoSyncCheckoutController {
  constructor(private readonly useCase: AutoSyncCheckoutUseCase) {}

  async createSession(req: Request, res: Response): Promise<void> {
    const userId = res.locals.owner as number;
    const userEmail = res.locals.email as string;
    const variant = parsePricingVariant(req.body?.variant);

    const result = await this.useCase.execute({ userId, userEmail, variant });
    res.json(result);
  }
}

export default AutoSyncCheckoutController;
