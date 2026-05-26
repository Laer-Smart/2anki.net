import { Request, Response } from 'express';
import { ListErrorGroupsUseCase } from '../usecases/ops/ListErrorGroupsUseCase';
import { ResolveErrorGroupUseCase } from '../usecases/ops/ResolveErrorGroupUseCase';
import { ReopenErrorGroupUseCase } from '../usecases/ops/ReopenErrorGroupUseCase';
import { ResolutionStatus } from '../data_layer/ErrorEventRepository';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const MESSAGE_HASH_PATTERN = /^[a-f0-9]{64}$/;

function parseSort(raw: unknown): 'last_seen' | 'occurrences' {
  return raw === 'occurrences' ? 'occurrences' : 'last_seen';
}

function parseSource(raw: unknown): 'web' | 'server' | undefined {
  if (raw === 'web') return 'web';
  if (raw === 'server') return 'server';
  return undefined;
}

function parseStatus(raw: unknown): ResolutionStatus {
  if (raw === 'resolved') return 'resolved';
  if (raw === 'all') return 'all';
  return 'unresolved';
}

function parseResolvedBy(owner: unknown): number | null {
  return typeof owner === 'number' ? owner : null;
}

export class OpsErrorsController {
  constructor(
    private readonly listErrorGroupsUseCase: ListErrorGroupsUseCase,
    private readonly resolveErrorGroupUseCase: ResolveErrorGroupUseCase,
    private readonly reopenErrorGroupUseCase: ReopenErrorGroupUseCase
  ) {}

  async list(req: Request, res: Response): Promise<void> {
    const limit = Math.min(Number(req.query.limit) || DEFAULT_LIMIT, MAX_LIMIT);
    const offset = Number(req.query.offset) || 0;
    const source = parseSource(req.query.source);
    const sort = parseSort(req.query.sort);
    const status = parseStatus(req.query.status);

    try {
      const result = await this.listErrorGroupsUseCase.execute({
        limit,
        offset,
        source,
        sort,
        status,
      });
      res.status(200).json(result);
    } catch (error) {
      console.error('[ops] list error groups failed', error);
      res.status(500).json({ message: 'Failed to load error groups' });
    }
  }

  async resolve(req: Request, res: Response): Promise<void> {
    const messageHash = req.params.messageHash;
    if (!MESSAGE_HASH_PATTERN.test(messageHash)) {
      res.status(400).json({ message: 'Invalid message hash' });
      return;
    }

    try {
      await this.resolveErrorGroupUseCase.execute(
        messageHash,
        parseResolvedBy(res.locals.owner)
      );
      res.status(204).end();
    } catch (error) {
      console.error('[ops] resolve error group failed', error);
      res.status(500).json({ message: 'Failed to resolve error group' });
    }
  }

  async reopen(req: Request, res: Response): Promise<void> {
    const messageHash = req.params.messageHash;
    if (!MESSAGE_HASH_PATTERN.test(messageHash)) {
      res.status(400).json({ message: 'Invalid message hash' });
      return;
    }

    try {
      await this.reopenErrorGroupUseCase.execute(messageHash);
      res.status(204).end();
    } catch (error) {
      console.error('[ops] reopen error group failed', error);
      res.status(500).json({ message: 'Failed to reopen error group' });
    }
  }
}
