import {
  CreateMindmapUseCase,
  MindmapLimitError,
} from './CreateMindmapUseCase';
import { MindmapRepositoryInterface } from '../../data_layer/MindmapRepository';
import Mindmaps, { MindmapsId } from '../../data_layer/public/Mindmaps';
import { UsersId } from '../../data_layer/public/Users';

function makeMap(id: string): Mindmaps {
  return {
    id: id as MindmapsId,
    user_id: 1 as UsersId,
    title: 'Test',
    data: { nodes: [], edges: [] },
    created_at: new Date(),
    updated_at: new Date(),
  };
}

function makeRepo(count: number): MindmapRepositoryInterface {
  return {
    create: jest.fn().mockResolvedValue(makeMap('new')),
    findById: jest.fn(),
    findByUserId: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    countByUserId: jest.fn().mockResolvedValue(count),
  };
}

const FREE_USER = { patreon: false };
const PAID_USER = { patreon: true };

describe('CreateMindmapUseCase', () => {
  it('creates a map for a free user under the cap', async () => {
    const repo = makeRepo(2);
    const useCase = new CreateMindmapUseCase(repo);

    const result = await useCase.execute({
      userId: 1 as UsersId,
      title: 'Anatomy',
      user: FREE_USER,
      subscriptions: [],
    });

    expect(result.id).toBe('new');
    expect(repo.create).toHaveBeenCalledTimes(1);
  });

  it('throws MindmapLimitError when free user is at cap (3)', async () => {
    const repo = makeRepo(3);
    const useCase = new CreateMindmapUseCase(repo);

    await expect(
      useCase.execute({
        userId: 1 as UsersId,
        title: 'New map',
        user: FREE_USER,
        subscriptions: [],
      })
    ).rejects.toBeInstanceOf(MindmapLimitError);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('allows a paid user to create even when above free cap', async () => {
    const repo = makeRepo(10);
    const useCase = new CreateMindmapUseCase(repo);

    const result = await useCase.execute({
      userId: 1 as UsersId,
      title: 'Map 11',
      user: PAID_USER,
      subscriptions: [],
    });

    expect(result.id).toBe('new');
    expect(repo.create).toHaveBeenCalledTimes(1);
  });

  it('allows an auto-sync subscriber to create beyond free cap', async () => {
    const repo = makeRepo(5);
    const useCase = new CreateMindmapUseCase(repo);
    const autoSyncProductId = 'prod_autosync';

    const result = await useCase.execute({
      userId: 1 as UsersId,
      title: 'Map',
      user: FREE_USER,
      subscriptions: [{ active: true, stripe_product_id: autoSyncProductId }],
      autoSyncProductId,
    });

    expect(result.id).toBe('new');
  });

  it('seeds a root node in the data passed to repo.create', async () => {
    const repo = makeRepo(0);
    const useCase = new CreateMindmapUseCase(repo);

    await useCase.execute({
      userId: 1 as UsersId,
      title: 'Organic Chemistry',
      user: FREE_USER,
      subscriptions: [],
    });

    const callArg = (repo.create as jest.Mock).mock.calls[0][0] as {
      data: { nodes: { id: string; label: string }[]; edges: unknown[] };
    };
    expect(callArg.data.nodes).toHaveLength(1);
    expect(callArg.data.nodes[0].label).toBe('Organic Chemistry');
    expect(typeof callArg.data.nodes[0].id).toBe('string');
    expect(callArg.data.edges).toHaveLength(0);
  });
});
