import { RecordApiCardUsageUseCase } from './RecordApiCardUsageUseCase';
import { SANDBOX_TIER, LIFETIME_TIER } from './ResolveDeveloperTierUseCase';
import type { IApiKeyUsageRepository } from '../../data_layer/ApiKeyUsageRepository';

function makeUsageRepo(
  totalAfterIncrement: number,
  warnedAt: Date | null = null
): jest.Mocked<IApiKeyUsageRepository> {
  return {
    getMonth: jest
      .fn()
      .mockResolvedValue({ cards: totalAfterIncrement, warned_at: warnedAt }),
    incrementCards: jest.fn().mockResolvedValue(totalAfterIncrement),
    markWarned: jest.fn().mockResolvedValue(true),
  };
}

function makeWarner() {
  return jest.fn().mockResolvedValue(undefined);
}

const NOW = new Date('2026-07-21T10:00:00Z');

describe('RecordApiCardUsageUseCase', () => {
  it('increments usage for a metered tier', async () => {
    const repo = makeUsageRepo(30);
    const useCase = new RecordApiCardUsageUseCase(repo, makeWarner());
    await useCase.execute({
      userId: 7,
      email: 'dev@example.com',
      cards: 30,
      tier: SANDBOX_TIER,
      now: NOW,
    });
    expect(repo.incrementCards).toHaveBeenCalledWith(7, NOW, 30);
  });

  it('still counts lifetime usage but never warns', async () => {
    const repo = makeUsageRepo(999_999);
    const warner = makeWarner();
    const useCase = new RecordApiCardUsageUseCase(repo, warner);
    await useCase.execute({
      userId: 7,
      email: 'dev@example.com',
      cards: 500,
      tier: LIFETIME_TIER,
      now: NOW,
    });
    expect(repo.incrementCards).toHaveBeenCalled();
    expect(warner).not.toHaveBeenCalled();
  });

  it('sends the warning once when usage crosses 80% of the cap', async () => {
    const repo = makeUsageRepo(85);
    const warner = makeWarner();
    const useCase = new RecordApiCardUsageUseCase(repo, warner);
    await useCase.execute({
      userId: 7,
      email: 'dev@example.com',
      cards: 10,
      tier: SANDBOX_TIER,
      now: NOW,
    });
    expect(repo.markWarned).toHaveBeenCalledWith(7, NOW);
    expect(warner).toHaveBeenCalledWith('dev@example.com', 85, 100, 'sandbox');
  });

  it('does not warn twice in the same month', async () => {
    const repo = makeUsageRepo(90, new Date('2026-07-15T00:00:00Z'));
    const warner = makeWarner();
    const useCase = new RecordApiCardUsageUseCase(repo, warner);
    await useCase.execute({
      userId: 7,
      email: 'dev@example.com',
      cards: 5,
      tier: SANDBOX_TIER,
      now: NOW,
    });
    expect(warner).not.toHaveBeenCalled();
    expect(repo.markWarned).not.toHaveBeenCalled();
  });

  it('does not warn below the threshold', async () => {
    const repo = makeUsageRepo(50);
    const warner = makeWarner();
    const useCase = new RecordApiCardUsageUseCase(repo, warner);
    await useCase.execute({
      userId: 7,
      email: 'dev@example.com',
      cards: 10,
      tier: SANDBOX_TIER,
      now: NOW,
    });
    expect(warner).not.toHaveBeenCalled();
  });

  it('never lets a warning failure break the conversion', async () => {
    const repo = makeUsageRepo(85);
    const warner = jest.fn().mockRejectedValue(new Error('smtp down'));
    const useCase = new RecordApiCardUsageUseCase(repo, warner);
    await expect(
      useCase.execute({
        userId: 7,
        email: 'dev@example.com',
        cards: 10,
        tier: SANDBOX_TIER,
        now: NOW,
      })
    ).resolves.toBeUndefined();
  });
});
