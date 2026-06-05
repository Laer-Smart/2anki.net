import type { IFeatureFlagsRepository } from '../../data_layer/FeatureFlagsRepository';
import {
  __resetFeatureFlagModuleForTests,
  __setFeatureFlagDependencies,
  getFeatureFlag,
  invalidateFeatureFlagCache,
} from './getFeatureFlag';

const buildRepo = (
  values: Map<string, boolean | null>
): IFeatureFlagsRepository & { getCalls: number } => {
  let getCalls = 0;
  return {
    get getCalls() {
      return getCalls;
    },
    set getCalls(_value: number) {
      getCalls = _value;
    },
    async get(key: string) {
      getCalls += 1;
      return values.has(key) ? (values.get(key) ?? null) : null;
    },
    async getAll() {
      return [];
    },
    async set() {
      return null;
    },
  } as IFeatureFlagsRepository & { getCalls: number };
};

describe('getFeatureFlag', () => {
  beforeEach(() => {
    __resetFeatureFlagModuleForTests();
  });

  afterAll(() => {
    __resetFeatureFlagModuleForTests();
  });

  it('returns the stored value when the key exists', async () => {
    const repo = buildRepo(new Map([['ai-converter-floor-v1', true]]));
    __setFeatureFlagDependencies({ repository: repo });
    const value = await getFeatureFlag('ai-converter-floor-v1', false);
    expect(value).toBe(true);
  });

  it('returns the default when the key is missing', async () => {
    const repo = buildRepo(new Map());
    __setFeatureFlagDependencies({ repository: repo });
    const value = await getFeatureFlag('does-not-exist', true);
    expect(value).toBe(true);
  });

  it('caches the result within the TTL', async () => {
    const repo = buildRepo(new Map([['k', true]]));
    let now = 1_000;
    __setFeatureFlagDependencies({ repository: repo, clock: () => now });

    await getFeatureFlag('k', false);
    await getFeatureFlag('k', false);
    now += 4_000;
    await getFeatureFlag('k', false);

    expect(repo.getCalls).toBe(1);
  });

  it('re-reads after the TTL expires', async () => {
    const repo = buildRepo(new Map([['k', true]]));
    let now = 1_000;
    __setFeatureFlagDependencies({ repository: repo, clock: () => now });

    await getFeatureFlag('k', false);
    now += 5_001;
    await getFeatureFlag('k', false);

    expect(repo.getCalls).toBe(2);
  });

  it('re-reads after invalidation', async () => {
    const repo = buildRepo(new Map([['k', true]]));
    __setFeatureFlagDependencies({ repository: repo });

    await getFeatureFlag('k', false);
    invalidateFeatureFlagCache('k');
    await getFeatureFlag('k', false);

    expect(repo.getCalls).toBe(2);
  });

  it('falls back to the default when the cache holds a known-missing key', async () => {
    const repo = buildRepo(new Map());
    __setFeatureFlagDependencies({ repository: repo });

    const first = await getFeatureFlag('k', true);
    const second = await getFeatureFlag('k', true);

    expect(first).toBe(true);
    expect(second).toBe(true);
    expect(repo.getCalls).toBe(1);
  });
});
