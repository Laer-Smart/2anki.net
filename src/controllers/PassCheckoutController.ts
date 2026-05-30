import { Request, Response } from 'express';
import { CreatePassCheckoutUseCase } from '../usecases/checkout/CreatePassCheckoutUseCase';
import { parsePricingVariant } from '../usecases/checkout/pricingVariant';

class PassCheckoutController {
  constructor(private readonly useCase: CreatePassCheckoutUseCase) {}

  async createSession(req: Request, res: Response): Promise<void> {
    const userId = res.locals.owner as number | undefined;
    const userEmail = res.locals.email as string | undefined;
    const variant = parsePricingVariant(req.body?.variant);
    const anonId = (req.cookies?.anon_id as string | undefined) ?? undefined;

    const result = await this.useCase.execute({ userId, userEmail, variant, anonId });
    res.json(result);
  }
}

export default PassCheckoutController;
