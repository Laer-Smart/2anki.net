import { GetMindmapImageStatsUseCase } from './GetMindmapImageStatsUseCase';
import { MindmapRepositoryInterface, MindmapImageStatsRow } from '../../data_layer/MindmapRepository';
import Mindmaps, { MindmapsId, MindmapsInitializer } from '../../data_layer/public/Mindmaps';
import { UsersId } from '../../data_layer/public/Users';

class StubRepo implements MindmapRepositoryInterface {
  constructor(private readonly stats: MindmapImageStatsRow) {}

  getMindmapImageStats = jest.fn().mockImplementation(() => Promise.resolve(this.stats));
  create = jest.fn<Promise<Mindmaps>, [Omit<MindmapsInitializer, 'id' | 'created_at' | 'updated_at'>]>();
  findById = jest.fn<Promise<Mindmaps | null>, [MindmapsId, UsersId]>();
  findByUserId = jest.fn<Promise<Mindmaps[]>, [UsersId]>();
  update = jest.fn<Promise<Mindmaps | null>, [MindmapsId, UsersId, Partial<Pick<Mindmaps, 'title' | 'data'>>]>();
  delete = jest.fn<Promise<void>, [MindmapsId, UsersId]>();
  countByUserId = jest.fn<Promise<number>, [UsersId]>();
}

describe('GetMindmapImageStatsUseCase', () => {
  it('returns null ratio when total is zero', async () => {
    const useCase = new GetMindmapImageStatsUseCase(new StubRepo({ total: 0, with_images: 0 }));

    const result = await useCase.execute();

    expect(result.total).toBe(0);
    expect(result.with_images).toBe(0);
    expect(result.ratio).toBeNull();
    expect(typeof result.as_of).toBe('string');
  });

  it('returns 0.5 ratio when half of maps have images', async () => {
    const useCase = new GetMindmapImageStatsUseCase(new StubRepo({ total: 4, with_images: 2 }));

    const result = await useCase.execute();

    expect(result.total).toBe(4);
    expect(result.with_images).toBe(2);
    expect(result.ratio).toBe(0.5);
  });

  it('returns 1 ratio when all maps have images', async () => {
    const useCase = new GetMindmapImageStatsUseCase(new StubRepo({ total: 7, with_images: 7 }));

    const result = await useCase.execute();

    expect(result.ratio).toBe(1);
  });

  it('rounds ratio to four decimal places', async () => {
    const useCase = new GetMindmapImageStatsUseCase(new StubRepo({ total: 3, with_images: 1 }));

    const result = await useCase.execute();

    expect(result.ratio).toBe(0.3333);
  });

  it('delegates to the repository exactly once', async () => {
    const repo = new StubRepo({ total: 10, with_images: 2 });
    const useCase = new GetMindmapImageStatsUseCase(repo);

    await useCase.execute();

    expect(repo.getMindmapImageStats).toHaveBeenCalledTimes(1);
  });
});
