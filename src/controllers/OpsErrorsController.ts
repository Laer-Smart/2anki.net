import { Request, Response } from 'express';
import { ListErrorGroupsUseCase } from '../usecases/ops/ListErrorGroupsUseCase';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

function parseSort(raw: unknown): 'last_seen' | 'occurrences' {
  return raw === 'occurrences' ? 'occurrences' : 'last_seen';
}

function parseSource(raw: unknown): 'web' | 'server' | undefined {
  if (raw === 'web') return 'web';
  if (raw === 'server') return 'server';
  return undefined;
}

export class OpsErrorsController {
  constructor(private readonly listErrorGroupsUseCase: ListErrorGroupsUseCase) {}

  async list(req: Request, res: Response): Promise<void> {
    const limit = Math.min(Number(req.query.limit) || DEFAULT_LIMIT, MAX_LIMIT);
    const offset = Number(req.query.offset) || 0;
    const source = parseSource(req.query.source);
    const sort = parseSort(req.query.sort);

    try {
      const result = await this.listErrorGroupsUseCase.execute({
        limit,
        offset,
        source,
        sort,
      });
      res.status(200).json(result);
    } catch (error) {
      console.error('[ops] list error groups failed', error);
      res.status(500).json({ message: 'Failed to load error groups' });
    }
  }
}
