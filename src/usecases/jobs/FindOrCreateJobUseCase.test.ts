import { FindOrCreateJobUseCase } from './FindOrCreateJobUseCase';
import JobRepository from '../../data_layer/JobRepository';

describe('FindOrCreateJobUseCase', () => {
  it('creates separate jobs for different owners with the same object_id', async () => {
    const jobs: Record<string, any> = {};
    let idCounter = 1;

    const jobRepository = {
      create: async (
        id: string,
        owner: string,
        title?: string | null,
        type?: string
      ) => {
        const key = `${id}:${owner}`;
        if (!jobs[key]) {
          jobs[key] = {
            id: idCounter++,
            object_id: id,
            owner,
            status: 'started',
            title,
            type,
          };
        }
        return [jobs[key].id];
      },
      findJobById: async (id: string, owner: string) => {
        const key = `${id}:${owner}`;
        return jobs[key] || null;
      },
    } as unknown as JobRepository;

    const useCase = new FindOrCreateJobUseCase(jobRepository);
    const notionPageId = '33e3e244-8dee-8044-916c-db66d504d507';

    const jobA = await useCase.execute({
      id: notionPageId,
      owner: 'user-a',
      title: 'Test Page',
      type: 'page',
    });

    const jobB = await useCase.execute({
      id: notionPageId,
      owner: 'user-b',
      title: 'Test Page',
      type: 'page',
    });

    expect(jobA.owner).toBe('user-a');
    expect(jobB.owner).toBe('user-b');
    expect(jobA.id).not.toBe(jobB.id);
  });
});
