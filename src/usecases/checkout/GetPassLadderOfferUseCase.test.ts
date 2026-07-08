import { InMemoryUserPassRepository } from '../../data_layer/UserPassRepository';
import { GetPassLadderOfferUseCase } from './GetPassLadderOfferUseCase';

const NOW = new Date('2026-07-08T12:00:00Z');
const DAY_MS = 24 * 60 * 60 * 1000;

function seedPass(
  repo: InMemoryUserPassRepository,
  userId: number,
  kind: '24h' | '7d' | 'unlimited',
  expiresDaysFromNow: number,
  intent: string
) {
  repo.seed({
    user_id: userId,
    kind,
    expires_at: new Date(NOW.getTime() + expiresDaysFromNow * DAY_MS),
    stripe_payment_intent_id: intent,
  });
}

describe('GetPassLadderOfferUseCase', () => {
  let repo: InMemoryUserPassRepository;
  let useCase: GetPassLadderOfferUseCase;

  beforeEach(() => {
    repo = new InMemoryUserPassRepository();
    useCase = new GetPassLadderOfferUseCase(repo);
  });

  it('offers the ladder to a user with two recent day passes', async () => {
    seedPass(repo, 7, '24h', 0.5, 'pi_1');
    seedPass(repo, 7, '24h', -10, 'pi_2');

    const offer = await useCase.execute(7, null, NOW);

    expect(offer).toEqual({ passCount: 2, spentUsd: 8 });
  });

  it('sums day and week pass prices', async () => {
    seedPass(repo, 7, '24h', 0.5, 'pi_1');
    seedPass(repo, 7, '7d', -5, 'pi_2');
    seedPass(repo, 7, '24h', -20, 'pi_3');

    const offer = await useCase.execute(7, null, NOW);

    expect(offer).toEqual({ passCount: 3, spentUsd: 17 });
  });

  it('returns null for a single pass', async () => {
    seedPass(repo, 7, '24h', 0.5, 'pi_1');

    expect(await useCase.execute(7, null, NOW)).toBeNull();
  });

  it('returns null for subscribers, lifetime, and apple plans', async () => {
    seedPass(repo, 7, '24h', 0.5, 'pi_1');
    seedPass(repo, 7, '24h', -10, 'pi_2');

    expect(await useCase.execute(7, 'stripe', NOW)).toBeNull();
    expect(await useCase.execute(7, 'lifetime', NOW)).toBeNull();
    expect(await useCase.execute(7, 'apple', NOW)).toBeNull();
  });

  it('ignores passes older than the 35-day window', async () => {
    seedPass(repo, 7, '24h', 0.5, 'pi_1');
    seedPass(repo, 7, '24h', -40, 'pi_2');

    expect(await useCase.execute(7, null, NOW)).toBeNull();
  });

  it('ignores unlimited entitlements and other users', async () => {
    seedPass(repo, 7, '24h', 0.5, 'pi_1');
    seedPass(repo, 7, 'unlimited', 300, 'apple:abc');
    seedPass(repo, 8, '24h', 0.5, 'pi_2');

    expect(await useCase.execute(7, null, NOW)).toBeNull();
  });
});
