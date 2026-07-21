import express from 'express';
import { getOwner } from '../lib/User/getOwner';
import CreateApiKeyUseCase, {
  ApiKeyLimitReachedError,
  InvalidApiKeyNameError,
} from '../usecases/developer/CreateApiKeyUseCase';
import ListApiKeysUseCase from '../usecases/developer/ListApiKeysUseCase';
import RevokeApiKeyUseCase from '../usecases/developer/RevokeApiKeyUseCase';
import type { ApiKeyListItem } from '../data_layer/ApiKeyRepository';

function toKeyResponse(key: ApiKeyListItem) {
  return {
    id: key.id,
    name: key.name,
    prefix: key.prefix,
    last_used_at: key.last_used_at?.toISOString() ?? null,
    created_at: key.created_at.toISOString(),
  };
}

export class DeveloperController {
  constructor(
    private readonly createKey: CreateApiKeyUseCase,
    private readonly listKeys: ListApiKeysUseCase,
    private readonly revokeKey: RevokeApiKeyUseCase
  ) {}

  async list(req: express.Request, res: express.Response) {
    const owner = getOwner(res);
    const keys = await this.listKeys.execute(Number(owner));
    res.status(200).json({ keys: keys.map(toKeyResponse) });
  }

  async create(req: express.Request, res: express.Response) {
    const owner = getOwner(res);
    const { name } = req.body as { name?: unknown };
    try {
      const created = await this.createKey.execute(Number(owner), name);
      res.status(201).json({
        ...toKeyResponse(created),
        secret: created.secret,
      });
    } catch (error) {
      if (error instanceof InvalidApiKeyNameError) {
        res.status(400).json({ message: error.message });
        return;
      }
      if (error instanceof ApiKeyLimitReachedError) {
        res.status(409).json({ message: error.message });
        return;
      }
      throw error;
    }
  }

  async revoke(req: express.Request, res: express.Response) {
    const owner = getOwner(res);
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ message: 'Invalid key id' });
      return;
    }
    const revoked = await this.revokeKey.execute(id, Number(owner));
    if (!revoked) {
      res.status(404).json({ message: 'Key not found' });
      return;
    }
    res.status(204).end();
  }
}

export default DeveloperController;
