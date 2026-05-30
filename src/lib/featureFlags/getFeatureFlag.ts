import type { IFeatureFlagsRepository } from '../../data_layer/FeatureFlagsRepository';
import { FeatureFlagsRepository } from '../../data_layer/FeatureFlagsRepository';
import { getDatabase } from '../../data_layer';

interface CacheEntry {
  value: boolean | null;
  expiresAt: number;
}

const CACHE_TTL_MS = 5_000;
const cache = new Map<string, CacheEntry>();
let repositoryOverride: IFeatureFlagsRepository | null = null;
let clock: () => number = () => Date.now();

const getRepository = (): IFeatureFlagsRepository => {
  if (repositoryOverride != null) return repositoryOverride;
  return new FeatureFlagsRepository(getDatabase());
};

export async function getFeatureFlag(
  key: string,
  defaultValue: boolean
): Promise<boolean> {
  const now = clock();
  const cached = cache.get(key);
  if (cached != null && cached.expiresAt > now) {
    return cached.value ?? defaultValue;
  }
  const value = await getRepository().get(key);
  cache.set(key, { value, expiresAt: now + CACHE_TTL_MS });
  return value ?? defaultValue;
}

export function invalidateFeatureFlagCache(key?: string): void {
  if (key == null) {
    cache.clear();
    return;
  }
  cache.delete(key);
}

export function __setFeatureFlagDependencies(opts: {
  repository?: IFeatureFlagsRepository | null;
  clock?: () => number;
}): void {
  if (opts.repository !== undefined) repositoryOverride = opts.repository;
  if (opts.clock != null) clock = opts.clock;
}

export function __resetFeatureFlagModuleForTests(): void {
  cache.clear();
  repositoryOverride = null;
  clock = () => Date.now();
}
