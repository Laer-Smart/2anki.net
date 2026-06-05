import { Request, Response } from 'express';
import { ResumeAbandonedCheckoutUseCase } from '../usecases/checkout/ResumeAbandonedCheckoutUseCase';
import type { EventsSink } from '../services/events/EventsSink';

class ResumeCheckoutController {
  constructor(
    private readonly useCase: ResumeAbandonedCheckoutUseCase,
    private readonly eventsSink: Pick<EventsSink, 'record'>
  ) {}

  async resume(req: Request, res: Response): Promise<void> {
    const result = await this.useCase.execute(req.query.token);
    this.eventsSink.record({
      name: 'email_clicked',
      props: { campaign: 'abandoned_checkout', resumed: result.resumed },
    });
    res.redirect(302, result.url);
  }
}

export default ResumeCheckoutController;
