import type {
  FeatureFlagWithEmail,
  IFeatureFlagsRepository,
} from '../../data_layer/FeatureFlagsRepository';
import { ListFeatureFlagsUseCase } from './ListFeatureFlagsUseCase';

describe('ListFeatureFlagsUseCase', () => {
  it('returns the flags from the repository', async () => {
    const rows: FeatureFlagWithEmail[] = [
      {
        key: 'ai-converter-floor-v1',
        value: false,
        description: 'desc',
        updated_at: '2026-05-30T12:00:00.000Z',
        updated_by: 1,
        updated_by_email: 'alex@example.com',
      },
    ];
    const repo: IFeatureFlagsRepository = {
      async getAll() {
        return rows;
      },
      async get() {
        return null;
      },
      async set() {
        return null;
      },
    };
    const result = await new ListFeatureFlagsUseCase(repo).execute();
    expect(result).toEqual(rows);
  });
});
