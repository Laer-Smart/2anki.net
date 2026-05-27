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
      const result = await repo.claimSession('cs_abc', 'alice@example.com', 'tok-1');
      expect(result).toBe(true);
    });

    it('returns false on duplicate claim', async () => {
      await repo.claimSession('cs_abc', 'alice@example.com', 'tok-1');
      const result = await repo.claimSession('cs_abc', 'alice@example.com', 'tok-2');
      expect(result).toBe(false);
    });

    it('stores the token against the session id', async () => {
      await repo.claimSession('cs_abc', 'alice@example.com', 'my-token');
      expect(repo.getTokenForSession('cs_abc')).toBe('my-token');
    });
  });

  describe('recordEmailSend', () => {
    it('stores the token against the email', async () => {
      await repo.recordEmailSend('alice@example.com', 'bulk-tok');
      expect(repo.getTokenForEmail('alice@example.com')).toBe('bulk-tok');
    });

    it('overwrites the token for the same email on repeat calls', async () => {
      await repo.recordEmailSend('alice@example.com', 'tok-first');
      await repo.recordEmailSend('alice@example.com', 'tok-second');
      expect(repo.getTokenForEmail('alice@example.com')).toBe('tok-second');
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
