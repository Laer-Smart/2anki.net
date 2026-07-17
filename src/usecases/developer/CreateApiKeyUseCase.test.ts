import CreateApiKeyUseCase, {
  ApiKeyLimitReachedError,
  InvalidApiKeyNameError,
} from './CreateApiKeyUseCase';
import {
  IApiKeyRepository,
  ApiKeyListItem,
  CreateApiKeyInput,
} from '../../data_layer/ApiKeyRepository';
import { hashApiKey } from '../../lib/apiKeys/apiKeyToken';

function makeRepo(existing: ApiKeyListItem[] = []): {
  repo: IApiKeyRepository;
  created: CreateApiKeyInput[];
} {
  const created: CreateApiKeyInput[] = [];
  const repo: IApiKeyRepository = {
    create: jest.fn(async (input: CreateApiKeyInput) => {
      created.push(input);
      return {
        id: 1,
        name: input.name,
        prefix: input.prefix,
        last_used_at: null,
        created_at: new Date('2026-07-18T00:00:00Z'),
      };
    }),
    findActiveByHash: jest.fn(async () => null),
    listByUser: jest.fn(async () => existing),
    revoke: jest.fn(async () => true),
    touchLastUsed: jest.fn(async () => undefined),
  };
  return { repo, created };
}

describe('CreateApiKeyUseCase', () => {
  it('returns the full secret once and persists only its hash + prefix', async () => {
    const { repo, created } = makeRepo();
    const result = await new CreateApiKeyUseCase(repo).execute(7, 'CLI laptop');

    expect(result.secret.startsWith('sk_live_')).toBe(true);
    expect(created[0]).toMatchObject({
      user_id: 7,
      name: 'CLI laptop',
      key_hash: hashApiKey(result.secret),
      prefix: result.prefix,
    });
    // the raw secret is never what we store
    expect(created[0].key_hash).not.toBe(result.secret);
  });

  it('rejects an empty name', async () => {
    const { repo } = makeRepo();
    await expect(
      new CreateApiKeyUseCase(repo).execute(7, '  ')
    ).rejects.toBeInstanceOf(InvalidApiKeyNameError);
  });

  it('rejects once the per-user key limit is reached', async () => {
    const existing = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      name: `k${i}`,
      prefix: 'sk_live_x',
      last_used_at: null,
      created_at: new Date(),
    }));
    const { repo } = makeRepo(existing);
    await expect(
      new CreateApiKeyUseCase(repo).execute(7, 'one more')
    ).rejects.toBeInstanceOf(ApiKeyLimitReachedError);
  });
});
