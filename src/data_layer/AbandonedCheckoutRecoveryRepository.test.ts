import {
  InMemoryAbandonedCheckoutRecoveryRepository,
} from './AbandonedCheckoutRecoveryRepository';

describe('InMemoryAbandonedCheckoutRecoveryRepository', () => {
  let repo: InMemoryAbandonedCheckoutRecoveryRepository;

  beforeEach(() => {
    repo = new InMemoryAbandonedCheckoutRecoveryRepository();
  });

  describe('claimSession', () => {
    it('returns true on first claim for a session', async () => {
      const result = await repo.claimSession('cs_abc', 'alice@example.com');
      expect(result).toBe(true);
    });

    it('returns false on duplicate claim', async () => {
      await repo.claimSession('cs_abc', 'alice@example.com');
      const result = await repo.claimSession('cs_abc', 'alice@example.com');
      expect(result).toBe(false);
    });
  });

  describe('isMarketingOptedOut', () => {
    it('returns false when the email is not in the opted-out list', async () => {
      const result = await repo.isMarketingOptedOut('alice@example.com');
      expect(result).toBe(false);
    });

    it('returns true after marking the email as opted out', async () => {
      repo.seedOptedOut('alice@example.com');
      const result = await repo.isMarketingOptedOut('alice@example.com');
      expect(result).toBe(true);
    });

    it('does not affect other emails', async () => {
      repo.seedOptedOut('alice@example.com');
      const result = await repo.isMarketingOptedOut('bob@example.com');
      expect(result).toBe(false);
    });
  });
});
