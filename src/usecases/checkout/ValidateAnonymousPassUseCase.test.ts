import { ValidateAnonymousPassUseCase } from './ValidateAnonymousPassUseCase';
import { InMemoryAnonymousPassRepository } from '../../data_layer/AnonymousPassRepository';

describe('ValidateAnonymousPassUseCase', () => {
  const now = new Date('2026-06-01T12:00:00Z');
  let repo: InMemoryAnonymousPassRepository;
  let useCase: ValidateAnonymousPassUseCase;

  beforeEach(() => {
    repo = new InMemoryAnonymousPassRepository();
    useCase = new ValidateAnonymousPassUseCase(repo);
  });

  it('returns valid=true and the pass for a valid unexpired token', async () => {
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    await repo.insert({ stripeSessionId: 'cs_valid', kind: '24h', expiresAt, paymentIntentId: 'pi_1' });

    const result = await useCase.execute('cs_valid', now);
    expect(result.valid).toBe(true);
    expect(result.pass).toMatchObject({ stripe_session_id: 'cs_valid', kind: '24h' });
  });

  it('returns valid=false for an expired token', async () => {
    const expiresAt = new Date(now.getTime() - 1000);
    await repo.insert({ stripeSessionId: 'cs_expired', kind: '24h', expiresAt, paymentIntentId: 'pi_2' });

    const result = await useCase.execute('cs_expired', now);
    expect(result.valid).toBe(false);
    expect(result.pass).toBeUndefined();
  });

  it('returns valid=false when no record exists', async () => {
    const result = await useCase.execute('cs_nonexistent', now);
    expect(result.valid).toBe(false);
  });

  it('returns valid=false for an empty session id', async () => {
    const result = await useCase.execute('', now);
    expect(result.valid).toBe(false);
  });
});
