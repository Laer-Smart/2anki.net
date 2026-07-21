import {
  ApiCardLimitError,
  CheckApiCardLimitUseCase,
} from './CheckApiCardLimitUseCase';
import { SANDBOX_TIER, LIFETIME_TIER } from './ResolveDeveloperTierUseCase';
import type { IApiKeyUsageRepository } from '../../data_layer/ApiKeyUsageRepository';

function makeUsageRepo(cards: number): jest.Mocked<IApiKeyUsageRepository> {
  return {
    getMonth: jest.fn().mockResolvedValue({ cards, warned_at: null }),
    incrementCards: jest.fn(),
    markWarned: jest.fn().mockResolvedValue(true),
  };
}

describe('CheckApiCardLimitUseCase', () => {
  it('allows a conversion under the tier cap', async () => {
    const useCase = new CheckApiCardLimitUseCase(makeUsageRepo(50));
    await expect(
      useCase.execute({
        userId: 7,
        candidateCardCount: 40,
        tier: SANDBOX_TIER,
        now: new Date('2026-07-21T10:00:00Z'),
      })
    ).resolves.toBeUndefined();
  });

  it('rejects a conversion that would cross the cap, fail closed', async () => {
    const useCase = new CheckApiCardLimitUseCase(makeUsageRepo(90));
    await expect(
      useCase.execute({
        userId: 7,
        candidateCardCount: 20,
        tier: SANDBOX_TIER,
        now: new Date('2026-07-21T10:00:00Z'),
      })
    ).rejects.toThrow(ApiCardLimitError);
  });

  it('carries usage, limit, tier, and reset date on the error', async () => {
    const useCase = new CheckApiCardLimitUseCase(makeUsageRepo(95));
    try {
      await useCase.execute({
        userId: 7,
        candidateCardCount: 10,
        tier: SANDBOX_TIER,
        now: new Date('2026-07-21T10:00:00Z'),
      });
      throw new Error('expected ApiCardLimitError');
    } catch (error) {
      const limitError = error as ApiCardLimitError;
      expect(limitError.cards_used).toBe(95);
      expect(limitError.limit).toBe(100);
      expect(limitError.tier_key).toBe('sandbox');
      expect(limitError.reset_on).toBe('2026-08-01T00:00:00.000Z');
    }
  });

  it('never blocks lifetime accounts', async () => {
    const repo = makeUsageRepo(1_000_000);
    const useCase = new CheckApiCardLimitUseCase(repo);
    await expect(
      useCase.execute({
        userId: 7,
        candidateCardCount: 5000,
        tier: LIFETIME_TIER,
        now: new Date('2026-07-21T10:00:00Z'),
      })
    ).resolves.toBeUndefined();
    expect(repo.getMonth).not.toHaveBeenCalled();
  });

  it('ignores zero-card candidates', async () => {
    const repo = makeUsageRepo(100);
    const useCase = new CheckApiCardLimitUseCase(repo);
    await expect(
      useCase.execute({
        userId: 7,
        candidateCardCount: 0,
        tier: SANDBOX_TIER,
        now: new Date('2026-07-21T10:00:00Z'),
      })
    ).resolves.toBeUndefined();
  });
});
