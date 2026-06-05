import { InMemoryCancellationFeedbackRepository } from './CancellationFeedbackRepository';

describe('InMemoryCancellationFeedbackRepository', () => {
  describe('countByReason', () => {
    it('groups rows by reason and orders by count desc', async () => {
      const repo = new InMemoryCancellationFeedbackRepository();
      const now = new Date('2026-05-09T12:00:00Z');
      repo.insert({ reason: 'Too expensive', created_at: now });
      repo.insert({ reason: 'Too expensive', created_at: now });
      repo.insert({ reason: 'Too expensive', created_at: now });
      repo.insert({ reason: "I don't use it enough", created_at: now });
      repo.insert({ reason: 'Other', comment: 'wat', created_at: now });

      const result = await repo.countByReason(new Date('2026-01-01T00:00:00Z'));

      expect(result).toEqual([
        { reason: 'Too expensive', count: 3 },
        { reason: "I don't use it enough", count: 1 },
        { reason: 'Other', count: 1 },
      ]);
    });

    it('excludes rows older than the since cutoff', async () => {
      const repo = new InMemoryCancellationFeedbackRepository();
      repo.insert({
        reason: 'Too expensive',
        created_at: new Date('2026-01-01T00:00:00Z'),
      });
      repo.insert({
        reason: 'Too expensive',
        created_at: new Date('2026-05-01T00:00:00Z'),
      });

      const result = await repo.countByReason(new Date('2026-04-01T00:00:00Z'));

      expect(result).toEqual([{ reason: 'Too expensive', count: 1 }]);
    });

    it('returns an empty array when nothing matches', async () => {
      const repo = new InMemoryCancellationFeedbackRepository();

      const result = await repo.countByReason(new Date('2026-01-01T00:00:00Z'));

      expect(result).toEqual([]);
    });
  });

  describe('recentComments', () => {
    it('returns only rows with non-empty comment, newest first, capped to limit', async () => {
      const repo = new InMemoryCancellationFeedbackRepository();
      repo.insert({
        reason: 'Other',
        comment: 'first',
        created_at: new Date('2026-05-01T00:00:00Z'),
      });
      repo.insert({
        reason: 'Other',
        comment: 'second',
        created_at: new Date('2026-05-05T00:00:00Z'),
      });
      repo.insert({
        reason: 'Other',
        comment: 'third',
        created_at: new Date('2026-05-09T00:00:00Z'),
      });
      repo.insert({
        reason: 'Too expensive',
        created_at: new Date('2026-05-09T00:00:00Z'),
      });
      repo.insert({
        reason: 'Other',
        comment: '',
        created_at: new Date('2026-05-09T00:00:00Z'),
      });

      const result = await repo.recentComments(2);

      expect(result).toEqual([
        {
          reason: 'Other',
          comment: 'third',
          created_at: '2026-05-09T00:00:00.000Z',
        },
        {
          reason: 'Other',
          comment: 'second',
          created_at: '2026-05-05T00:00:00.000Z',
        },
      ]);
    });

    it('returns an empty array when no rows have a comment', async () => {
      const repo = new InMemoryCancellationFeedbackRepository();
      repo.insert({ reason: 'Too expensive' });

      const result = await repo.recentComments(20);

      expect(result).toEqual([]);
    });
  });
});
