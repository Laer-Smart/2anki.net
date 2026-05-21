import { InMemoryUserVisibleErrorsRepository } from './UserVisibleErrorsRepository';

describe('InMemoryUserVisibleErrorsRepository', () => {
  describe('record + countBySurfaceAndCode', () => {
    it('counts a recorded error within the window', async () => {
      const repo = new InMemoryUserVisibleErrorsRepository();
      await repo.record({ userId: null, surface: 'oauth_google', code: 'oauth_cancelled' });

      const result = await repo.countBySurfaceAndCode(1);

      expect(result).toEqual([{ surface: 'oauth_google', code: 'oauth_cancelled', count: 1 }]);
    });

    it('groups by surface and code', async () => {
      const repo = new InMemoryUserVisibleErrorsRepository();
      await repo.record({ userId: 1, surface: 'oauth_google', code: 'oauth_cancelled' });
      await repo.record({ userId: 2, surface: 'oauth_google', code: 'oauth_cancelled' });
      await repo.record({ userId: null, surface: 'stripe_webhook', code: 'stripe_webhook_signature_invalid' });

      const result = await repo.countBySurfaceAndCode(7);

      expect(result).toEqual([
        { surface: 'oauth_google', code: 'oauth_cancelled', count: 2 },
        { surface: 'stripe_webhook', code: 'stripe_webhook_signature_invalid', count: 1 },
      ]);
    });

    it('returns empty array when no rows fall within the window', async () => {
      const repo = new InMemoryUserVisibleErrorsRepository();

      const result = await repo.countBySurfaceAndCode(1);

      expect(result).toEqual([]);
    });

    it('accepts context payload on record', async () => {
      const repo = new InMemoryUserVisibleErrorsRepository();
      await repo.record({
        userId: null,
        surface: 'stripe_webhook',
        code: 'stripe_webhook_signature_invalid',
        context: { message: 'No signatures found' },
      });

      const result = await repo.countBySurfaceAndCode(1);

      expect(result).toHaveLength(1);
      expect(result[0].code).toBe('stripe_webhook_signature_invalid');
    });
  });
});
