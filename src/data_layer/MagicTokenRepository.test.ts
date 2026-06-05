import { InMemoryMagicTokenRepository } from './MagicTokenRepository';

describe('InMemoryMagicTokenRepository', () => {
  const NOW = new Date('2026-05-12T12:00:00Z');
  const FIFTEEN_MINUTES_LATER = new Date('2026-05-12T12:15:00Z');
  const ONE_MINUTE_LATER = new Date('2026-05-12T12:01:00Z');

  function buildRepo(): InMemoryMagicTokenRepository {
    const repo = new InMemoryMagicTokenRepository();
    repo.setNow(NOW);
    return repo;
  }

  describe('create and findValidToken', () => {
    it('stores a token and retrieves it when valid', async () => {
      const repo = buildRepo();
      await repo.create('abc123', 1, 'login', FIFTEEN_MINUTES_LATER);

      const result = await repo.findValidToken('abc123');

      expect(result).toMatchObject({
        token: 'abc123',
        owner: 1,
        purpose: 'login',
        used_at: null,
      });
    });

    it('returns null for a non-existent token', async () => {
      const repo = buildRepo();

      const result = await repo.findValidToken('does-not-exist');

      expect(result).toBeNull();
    });

    it('returns null for an expired token', async () => {
      const repo = buildRepo();
      const alreadyExpired = new Date('2026-05-12T11:00:00Z');
      await repo.create('expired-tok', 1, 'login', alreadyExpired);

      const result = await repo.findValidToken('expired-tok');

      expect(result).toBeNull();
    });
  });

  describe('markUsed', () => {
    it('marks a token as used so it cannot be found again', async () => {
      const repo = buildRepo();
      await repo.create('use-me', 2, 'password_reset', FIFTEEN_MINUTES_LATER);

      await repo.markUsed('use-me');

      const result = await repo.findValidToken('use-me');
      expect(result).toBeNull();
    });
  });

  describe('countRecentByOwner', () => {
    it('counts tokens created after the given date for the owner', async () => {
      const repo = buildRepo();
      await repo.create('t1', 5, 'login', FIFTEEN_MINUTES_LATER);
      await repo.create('t2', 5, 'login', FIFTEEN_MINUTES_LATER);
      await repo.create('t3', 99, 'login', FIFTEEN_MINUTES_LATER);

      const count = await repo.countRecentByOwner(
        5,
        new Date('2026-05-12T11:00:00Z')
      );

      expect(count).toBe(2);
    });

    it('excludes tokens created before the since cutoff', async () => {
      const repo = buildRepo();
      repo.setNow(new Date('2026-05-12T10:00:00Z'));
      await repo.create('old-tok', 5, 'login', FIFTEEN_MINUTES_LATER);

      repo.setNow(NOW);
      await repo.create('new-tok', 5, 'login', FIFTEEN_MINUTES_LATER);

      const count = await repo.countRecentByOwner(
        5,
        new Date('2026-05-12T11:00:00Z')
      );

      expect(count).toBe(1);
    });

    it('returns zero when no tokens match', async () => {
      const repo = buildRepo();

      const count = await repo.countRecentByOwner(
        42,
        new Date('2026-05-12T11:00:00Z')
      );

      expect(count).toBe(0);
    });
  });

  describe('deleteExpired', () => {
    it('removes expired tokens and returns the count', async () => {
      const repo = buildRepo();
      const alreadyExpired = new Date('2026-05-12T11:00:00Z');
      await repo.create('expired', 1, 'login', alreadyExpired);
      await repo.create('valid', 1, 'login', FIFTEEN_MINUTES_LATER);

      const deleted = await repo.deleteExpired();

      expect(deleted).toBe(1);
      const stillValid = await repo.findValidToken('valid');
      expect(stillValid).not.toBeNull();
    });

    it('returns zero when nothing is expired', async () => {
      const repo = buildRepo();
      await repo.create('fresh', 1, 'login', FIFTEEN_MINUTES_LATER);

      const deleted = await repo.deleteExpired();

      expect(deleted).toBe(0);
    });
  });
});
