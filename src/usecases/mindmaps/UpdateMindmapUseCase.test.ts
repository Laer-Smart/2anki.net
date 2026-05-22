import { UpdateMindmapUseCase, MindmapLimitError } from './UpdateMindmapUseCase';
import { MindmapRepositoryInterface } from '../../data_layer/MindmapRepository';
import Mindmaps, { MindmapData, MindmapsId } from '../../data_layer/public/Mindmaps';
import { UsersId } from '../../data_layer/public/Users';

function makeMap(nodeCount: number): Mindmaps {
  const nodes = Array.from({ length: nodeCount }, (_, i) => ({
    id: String(i),
    label: `Node ${i}`,
  }));
  return {
    id: 'map-1' as MindmapsId,
    user_id: 1 as UsersId,
    title: 'Test',
    data: { nodes, edges: [] },
    created_at: new Date(),
    updated_at: new Date(),
  };
}

function makeRepo(updatedMap: Mindmaps | null = null): MindmapRepositoryInterface {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findByUserId: jest.fn(),
    update: jest.fn().mockResolvedValue(updatedMap),
    delete: jest.fn(),
    countByUserId: jest.fn(),
  };
}

const FREE_USER = { patreon: false as null };
const PAID_USER = { patreon: true as null };

describe('UpdateMindmapUseCase', () => {
  it('updates map for free user within node cap', async () => {
    const updated = makeMap(10);
    const repo = makeRepo(updated);
    const useCase = new UpdateMindmapUseCase(repo);

    const data: MindmapData = {
      nodes: Array.from({ length: 10 }, (_, i) => ({ id: String(i), label: `N${i}` })),
      edges: [],
    };

    const result = await useCase.execute({
      id: 'map-1' as MindmapsId,
      userId: 1 as UsersId,
      data,
      user: FREE_USER,
      subscriptions: [],
    });

    expect(result?.data.nodes.length).toBe(10);
    expect(repo.update).toHaveBeenCalled();
  });

  it('throws MindmapLimitError for free user exceeding 50 nodes', async () => {
    const repo = makeRepo(null);
    const useCase = new UpdateMindmapUseCase(repo);

    const data: MindmapData = {
      nodes: Array.from({ length: 51 }, (_, i) => ({ id: String(i), label: `N${i}` })),
      edges: [],
    };

    await expect(
      useCase.execute({
        id: 'map-1' as MindmapsId,
        userId: 1 as UsersId,
        data,
        user: FREE_USER,
        subscriptions: [],
      })
    ).rejects.toBeInstanceOf(MindmapLimitError);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('allows paid user to exceed 50 nodes', async () => {
    const bigMap = makeMap(100);
    const repo = makeRepo(bigMap);
    const useCase = new UpdateMindmapUseCase(repo);

    const data: MindmapData = {
      nodes: Array.from({ length: 100 }, (_, i) => ({ id: String(i), label: `N${i}` })),
      edges: [],
    };

    const result = await useCase.execute({
      id: 'map-1' as MindmapsId,
      userId: 1 as UsersId,
      data,
      user: PAID_USER,
      subscriptions: [],
    });

    expect(result?.data.nodes.length).toBe(100);
    expect(repo.update).toHaveBeenCalled();
  });

  it('allows exactly 50 nodes for free user', async () => {
    const map50 = makeMap(50);
    const repo = makeRepo(map50);
    const useCase = new UpdateMindmapUseCase(repo);

    const data: MindmapData = {
      nodes: Array.from({ length: 50 }, (_, i) => ({ id: String(i), label: `N${i}` })),
      edges: [],
    };

    const result = await useCase.execute({
      id: 'map-1' as MindmapsId,
      userId: 1 as UsersId,
      data,
      user: FREE_USER,
      subscriptions: [],
    });

    expect(result?.data.nodes.length).toBe(50);
  });
});
