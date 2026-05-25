import { InMemoryTrialEndedEmailRepository } from './TrialEndedEmailRepository';

describe('InMemoryTrialEndedEmailRepository', () => {
  let repo: InMemoryTrialEndedEmailRepository;

  beforeEach(() => {
    repo = new InMemoryTrialEndedEmailRepository();
  });

  describe('getUsersToNotify', () => {
    it('returns seeded users that have not been emailed', async () => {
      repo.seedUsers([
        { id: 1, name: 'Alice', email: 'alice@example.com', trialStartedAt: new Date('2026-05-25T10:00:00Z') },
        { id: 2, name: 'Bob', email: 'bob@example.com', trialStartedAt: new Date('2026-05-25T11:00:00Z') },
      ]);

      const users = await repo.getUsersToNotify();

      expect(users).toEqual([
        { id: 1, name: 'Alice', email: 'alice@example.com', trialStartedAt: new Date('2026-05-25T10:00:00Z') },
        { id: 2, name: 'Bob', email: 'bob@example.com', trialStartedAt: new Date('2026-05-25T11:00:00Z') },
      ]);
    });

    it('excludes a user once a send has been recorded', async () => {
      repo.seedUsers([
        { id: 1, name: 'Alice', email: 'alice@example.com', trialStartedAt: new Date('2026-05-25T10:00:00Z') },
      ]);
      await repo.recordSend(1, 'token-1');

      const users = await repo.getUsersToNotify();

      expect(users).toEqual([]);
    });

    it('caps the result at the given limit', async () => {
      repo.seedUsers([
        { id: 1, name: 'A', email: 'a@example.com', trialStartedAt: new Date() },
        { id: 2, name: 'B', email: 'b@example.com', trialStartedAt: new Date() },
        { id: 3, name: 'C', email: 'c@example.com', trialStartedAt: new Date() },
      ]);

      const users = await repo.getUsersToNotify(2);

      expect(users.map((u) => u.id)).toEqual([1, 2]);
    });
  });

  describe('countDecksInTrialWindow', () => {
    it('returns the seeded count for a user', async () => {
      repo.seedDeckCount(7, 3);

      const count = await repo.countDecksInTrialWindow(7);

      expect(count).toBe(3);
    });

    it('returns 0 when no count is seeded', async () => {
      const count = await repo.countDecksInTrialWindow(99);

      expect(count).toBe(0);
    });
  });

  describe('recordSend and findByToken', () => {
    it('resolves a recorded token to its user', async () => {
      await repo.recordSend(42, 'token-42');

      const result = await repo.findByToken('token-42');

      expect(result).toEqual({ id: 1, userId: 42 });
    });

    it('returns null for an unknown token', async () => {
      const result = await repo.findByToken('missing');

      expect(result).toBeNull();
    });

    it('tracks every recorded user id', async () => {
      await repo.recordSend(1, 't1');
      await repo.recordSend(2, 't2');

      expect(repo.getSentUserIds()).toEqual(new Set([1, 2]));
    });
  });
});
