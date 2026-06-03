import { Request, Response } from 'express';

import { GetRecentSourcesUseCase } from '../../usecases/uploads/GetRecentSourcesUseCase';

export class RecentSourcesController {
  constructor(private readonly useCase: GetRecentSourcesUseCase) {}

  async get(_req: Request, res: Response): Promise<void> {
    const userId = res.locals.owner as number;
    const sources = await this.useCase.execute(userId);
    res.status(200).json({ sources });
  }
}
