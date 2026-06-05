import { InMemoryReEngagementFeedbackRepository } from './ReEngagementFeedbackRepository';

describe('InMemoryReEngagementFeedbackRepository', () => {
  describe('countByReason', () => {
    it('groups rows by stopped_reason and orders by count desc', async () => {
      const repo = new InMemoryReEngagementFeedbackRepository();
      const now = new Date('2026-05-09T12:00:00Z');
      repo.insert({
        stopped_reason: 'Switched to another tool',
        content_type: 'pdf',
        created_at: now,
      });
      repo.insert({
        stopped_reason: 'Switched to another tool',
        content_type: 'pdf',
        created_at: now,
      });
      repo.insert({
        stopped_reason: 'Switched to another tool',
        content_type: 'notion',
        created_at: now,
      });
      repo.insert({
        stopped_reason: 'No longer studying',
        content_type: 'pdf',
        created_at: now,
      });

      const result = await repo.countByReason(new Date('2026-01-01T00:00:00Z'));

      expect(result).toEqual([
        { stopped_reason: 'Switched to another tool', count: 3 },
        { stopped_reason: 'No longer studying', count: 1 },
      ]);
    });

    it('excludes rows older than the since cutoff', async () => {
      const repo = new InMemoryReEngagementFeedbackRepository();
      repo.insert({
        stopped_reason: 'Switched to another tool',
        content_type: 'pdf',
        created_at: new Date('2026-01-01T00:00:00Z'),
      });
      repo.insert({
        stopped_reason: 'Switched to another tool',
        content_type: 'pdf',
        created_at: new Date('2026-05-01T00:00:00Z'),
      });

      const result = await repo.countByReason(new Date('2026-04-01T00:00:00Z'));

      expect(result).toEqual([
        { stopped_reason: 'Switched to another tool', count: 1 },
      ]);
    });

    it('returns an empty array when nothing matches', async () => {
      const repo = new InMemoryReEngagementFeedbackRepository();
      const result = await repo.countByReason(new Date('2026-01-01T00:00:00Z'));
      expect(result).toEqual([]);
    });
  });

  describe('recentComments', () => {
    it('returns only rows with non-empty comment, newest first, capped to limit', async () => {
      const repo = new InMemoryReEngagementFeedbackRepository();
      repo.insert({
        stopped_reason: 'Other',
        content_type: 'pdf',
        comment: 'first',
        created_at: new Date('2026-05-01T00:00:00Z'),
      });
      repo.insert({
        stopped_reason: 'Other',
        content_type: 'pdf',
        comment: 'second',
        created_at: new Date('2026-05-05T00:00:00Z'),
      });
      repo.insert({
        stopped_reason: 'Other',
        content_type: 'notion',
        comment: 'third',
        created_at: new Date('2026-05-09T00:00:00Z'),
      });
      repo.insert({
        stopped_reason: 'No longer studying',
        content_type: 'pdf',
        created_at: new Date('2026-05-09T00:00:00Z'),
      });
      repo.insert({
        stopped_reason: 'Other',
        content_type: 'pdf',
        comment: '',
        created_at: new Date('2026-05-09T00:00:00Z'),
      });

      const result = await repo.recentComments(2);

      expect(result).toEqual([
        {
          stopped_reason: 'Other',
          content_type: 'notion',
          comment: 'third',
          created_at: '2026-05-09T00:00:00.000Z',
        },
        {
          stopped_reason: 'Other',
          content_type: 'pdf',
          comment: 'second',
          created_at: '2026-05-05T00:00:00.000Z',
        },
      ]);
    });

    it('returns an empty array when no rows have a comment', async () => {
      const repo = new InMemoryReEngagementFeedbackRepository();
      repo.insert({
        stopped_reason: 'No longer studying',
        content_type: 'pdf',
      });
      const result = await repo.recentComments(20);
      expect(result).toEqual([]);
    });
  });
});
