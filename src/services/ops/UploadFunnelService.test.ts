import { UploadFunnelService } from './UploadFunnelService';
import type {
  IEventsRepository,
  UploadFunnelStageRow,
} from '../../data_layer/EventsRepository';

function makeRepo(rows: UploadFunnelStageRow[]): IEventsRepository {
  return {
    insertEvents: jest.fn(),
    countByName: jest.fn(),
    countDistinctUsers: jest.fn(),
    countByNameForUser: jest.fn(),
    groupPaywallShownByVariantAndSurface: jest.fn(),
    groupPaywallClicksByVariant: jest.fn(),
    groupUploadFunnel: jest.fn().mockResolvedValue(rows),
  };
}

describe('UploadFunnelService', () => {
  const since = new Date('2026-05-01T00:00:00Z');

  it('returns per-stage distinct-identity counts', async () => {
    const repo = makeRepo([
      { stage: 'upload_started', distinct_identities: 100 },
      { stage: 'conversion_succeeded', distinct_identities: 72 },
      { stage: 'conversion_failed', distinct_identities: 20 },
      { stage: 'deck_downloaded', distinct_identities: 60 },
    ]);
    const service = new UploadFunnelService({ eventsRepo: repo });

    const result = await service.getMetrics(since);

    expect(result.stages).toEqual({
      upload_started: 100,
      conversion_succeeded: 72,
      conversion_failed: 20,
      deck_downloaded: 60,
      paywall_shown: 0,
      paid: 0,
    });
    expect(result.since).toBe(since.toISOString());
  });

  it('carries the paywall_shown and paid stages through to the response', async () => {
    const repo = makeRepo([
      { stage: 'upload_started', distinct_identities: 100 },
      { stage: 'deck_downloaded', distinct_identities: 60 },
      { stage: 'paywall_shown', distinct_identities: 30 },
      { stage: 'checkout_completed', distinct_identities: 12 },
    ]);
    const service = new UploadFunnelService({ eventsRepo: repo });

    const result = await service.getMetrics(since);

    expect(result.stages?.paywall_shown).toBe(30);
    expect(result.stages?.paid).toBe(12);
  });

  it('computes the download to paid conversion rate', async () => {
    const repo = makeRepo([
      { stage: 'deck_downloaded', distinct_identities: 80 },
      { stage: 'checkout_completed', distinct_identities: 20 },
    ]);
    const service = new UploadFunnelService({ eventsRepo: repo });

    const result = await service.getMetrics(since);

    expect(result.download_to_paid_rate_pct).toBe(25);
  });

  it('reports a zero paid rate when no decks were downloaded', async () => {
    const repo = makeRepo([
      { stage: 'checkout_completed', distinct_identities: 5 },
    ]);
    const service = new UploadFunnelService({ eventsRepo: repo });

    const result = await service.getMetrics(since);

    expect(result.stages?.deck_downloaded).toBe(0);
    expect(result.download_to_paid_rate_pct).toBe(0);
  });

  it('computes the true upload to download success rate', async () => {
    const repo = makeRepo([
      { stage: 'upload_started', distinct_identities: 200 },
      { stage: 'deck_downloaded', distinct_identities: 50 },
    ]);
    const service = new UploadFunnelService({ eventsRepo: repo });

    const result = await service.getMetrics(since);

    expect(result.upload_to_download_rate_pct).toBe(25);
  });

  it('reports a zero rate when no uploads started', async () => {
    const repo = makeRepo([{ stage: 'deck_downloaded', distinct_identities: 10 }]);
    const service = new UploadFunnelService({ eventsRepo: repo });

    const result = await service.getMetrics(since);

    expect(result.stages?.upload_started).toBe(0);
    expect(result.upload_to_download_rate_pct).toBe(0);
  });

  it('surfaces a repository error without throwing', async () => {
    const repo = makeRepo([]);
    (repo.groupUploadFunnel as jest.Mock).mockRejectedValueOnce(
      new Error('db down')
    );
    const service = new UploadFunnelService({ eventsRepo: repo });

    const result = await service.getMetrics(since);

    expect(result.stages).toBeNull();
    expect(result.error).toBe('db down');
  });
});
