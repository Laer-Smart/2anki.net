import {
  ObservabilityQueryService,
  OpsMetricsWindow,
  OPS_METRICS_BUCKET_SECONDS_BY_WINDOW,
} from './ObservabilityQueryService';
import {
  IObservabilityRepository,
  RequestLogRow,
  OutboundCallLogRow,
  AggregatedRequestRow,
  RouteLatencyRow,
  OutboundCallBucketRow,
  RouteErrorRateRow,
  ServiceErrorRateRow,
  ServiceLatencyRow,
} from '../../data_layer/ObservabilityRepository';

class StubRepo implements IObservabilityRepository {
  inboundBuckets: AggregatedRequestRow[] = [];
  routeLatency: RouteLatencyRow[] = [];
  outboundBuckets: OutboundCallBucketRow[] = [];
  outboundLatency: ServiceLatencyRow[] = [];
  routeErrors: RouteErrorRateRow[] = [];
  serviceErrors: ServiceErrorRateRow[] = [];
  capturedFromTime: Date | null = null;
  capturedBucketSeconds: number | null = null;

  insertRequestLogs = async (_rows: RequestLogRow[]) => {};
  insertOutboundCallLogs = async (_rows: OutboundCallLogRow[]) => {};
  deleteOlderThan = async () => ({ requestLogs: 0, outboundCallLogs: 0 });

  aggregateInboundByStatusClass = async (
    fromTime: Date,
    bucketSeconds: number
  ) => {
    this.capturedFromTime = fromTime;
    this.capturedBucketSeconds = bucketSeconds;
    return this.inboundBuckets;
  };
  topRoutesByLatency = async (_fromTime: Date, _limit: number) =>
    this.routeLatency;
  aggregateOutboundByService = async (
    _fromTime: Date,
    _bucketSeconds: number
  ) => this.outboundBuckets;
  outboundLatencyByService = async (_fromTime: Date, _limit: number) =>
    this.outboundLatency;
  errorRateByRoute = async (_fromTime: Date, _limit: number) =>
    this.routeErrors;
  errorRateByService = async (_fromTime: Date, _limit: number) =>
    this.serviceErrors;
}

describe('ObservabilityQueryService', () => {
  it('rejects an unsupported window', async () => {
    const repo = new StubRepo();
    const service = new ObservabilityQueryService(repo);
    await expect(service.getMetrics('bogus' as never)).rejects.toThrow(
      /unsupported window/i
    );
  });

  it.each<[OpsMetricsWindow, number]>([
    ['1h', 60 * 60 * 1000],
    ['24h', 24 * 60 * 60 * 1000],
    ['7d', 7 * 24 * 60 * 60 * 1000],
  ])(
    'passes a fromTime that matches the %s window',
    async (window, expectedMs) => {
      const repo = new StubRepo();
      const service = new ObservabilityQueryService(repo);
      const before = Date.now();
      await service.getMetrics(window);
      const after = Date.now();

      const captured = repo.capturedFromTime!.getTime();
      expect(captured).toBeGreaterThanOrEqual(before - expectedMs);
      expect(captured).toBeLessThanOrEqual(after - expectedMs);
      expect(repo.capturedBucketSeconds).toBe(
        OPS_METRICS_BUCKET_SECONDS_BY_WINDOW[window]
      );
    }
  );

  it('shapes the result into the expected payload', async () => {
    const repo = new StubRepo();
    repo.inboundBuckets = [
      {
        bucket: new Date('2026-05-09T10:00:00Z'),
        status_class: '2xx',
        count: 9,
      },
      {
        bucket: new Date('2026-05-09T10:00:00Z'),
        status_class: '5xx',
        count: 1,
      },
    ];
    repo.routeLatency = [
      {
        method: 'GET',
        route: '/api/upload',
        avg_ms: 50,
        p95_ms: 200,
        count: 10,
      },
    ];
    repo.outboundBuckets = [
      { bucket: new Date('2026-05-09T10:00:00Z'), service: 'notion', count: 4 },
    ];
    repo.outboundLatency = [
      { service: 'notion', p50_ms: 110, p95_ms: 460, p99_ms: 820, count: 250 },
      { service: 'claude', p50_ms: 380, p95_ms: 1200, p99_ms: 2100, count: 90 },
    ];
    repo.routeErrors = [
      { method: 'GET', route: '/api/upload', total: 100, errors: 3 },
    ];
    repo.serviceErrors = [{ service: 'notion', total: 50, errors: 2 }];

    const service = new ObservabilityQueryService(repo);
    const result = await service.getMetrics('24h');

    expect(result.window).toBe('24h');
    expect(result.bucket_seconds).toBe(
      OPS_METRICS_BUCKET_SECONDS_BY_WINDOW['24h']
    );
    expect(result.inbound_volume).toEqual([
      {
        bucket: '2026-05-09T10:00:00.000Z',
        status_class: '2xx',
        count: 9,
      },
      {
        bucket: '2026-05-09T10:00:00.000Z',
        status_class: '5xx',
        count: 1,
      },
    ]);
    expect(result.route_latency[0]).toEqual({
      method: 'GET',
      route: '/api/upload',
      avg_ms: 50,
      p95_ms: 200,
      count: 10,
    });
    expect(result.outbound_volume[0]).toMatchObject({
      service: 'notion',
      count: 4,
    });
    expect(result.error_rate_by_route[0]).toEqual({
      method: 'GET',
      route: '/api/upload',
      total: 100,
      errors: 3,
    });
    expect(result.error_rate_by_service[0]).toEqual({
      service: 'notion',
      total: 50,
      errors: 2,
    });
    expect(result.outbound_latency_by_service).toEqual([
      { service: 'notion', p50_ms: 110, p95_ms: 460, p99_ms: 820, count: 250 },
      { service: 'claude', p50_ms: 380, p95_ms: 1200, p99_ms: 2100, count: 90 },
    ]);
  });

  it('returns an empty unsupported_blocks array when no repo is wired', async () => {
    const repo = new StubRepo();
    const service = new ObservabilityQueryService(repo);
    const result = await service.getMetrics('24h');
    expect(result.unsupported_blocks).toEqual([]);
  });

  it('maps unsupported block rows into the typed response shape', async () => {
    const repo = new StubRepo();
    const unsupportedRepo = {
      record: async () => undefined,
      list: async () => [
        {
          block_type: 'html',
          occurrences: 42,
          first_seen: '2026-06-01T00:00:00.000Z',
          last_seen: '2026-07-01T00:00:00.000Z',
        },
      ],
    };
    const service = new ObservabilityQueryService(repo, unsupportedRepo);
    const result = await service.getMetrics('24h');
    expect(result.unsupported_blocks).toEqual([
      {
        block_type: 'html',
        occurrences: 42,
        first_seen: '2026-06-01T00:00:00.000Z',
        last_seen: '2026-07-01T00:00:00.000Z',
      },
    ]);
  });

  it('defaults conversion_output and parse_path_signatures to empty when no repos are wired', async () => {
    const repo = new StubRepo();
    const service = new ObservabilityQueryService(repo);
    const result = await service.getMetrics('24h');
    expect(result.conversion_output).toEqual([]);
    expect(result.parse_path_signatures).toEqual([]);
  });

  it('maps conversion output and parse-path rows into the typed response shape', async () => {
    const repo = new StubRepo();
    const conversionOutputRepo = {
      record: async () => undefined,
      list: async () => [
        {
          source: 'upload',
          decks: 3,
          cards: 120,
          empty_back_cards: 7,
          first_seen: '2026-06-01T00:00:00.000Z',
          last_seen: '2026-07-01T00:00:00.000Z',
        },
      ],
    };
    const parsePathRepo = {
      record: async () => undefined,
      list: async () => [
        {
          parse_path: 'unclassified',
          occurrences: 5,
          first_seen: '2026-06-01T00:00:00.000Z',
          last_seen: '2026-07-01T00:00:00.000Z',
        },
      ],
    };
    const service = new ObservabilityQueryService(
      repo,
      undefined,
      conversionOutputRepo,
      parsePathRepo
    );
    const result = await service.getMetrics('24h');
    expect(result.conversion_output).toEqual([
      {
        source: 'upload',
        decks: 3,
        cards: 120,
        empty_back_cards: 7,
        first_seen: '2026-06-01T00:00:00.000Z',
        last_seen: '2026-07-01T00:00:00.000Z',
      },
    ]);
    expect(result.parse_path_signatures).toEqual([
      {
        parse_path: 'unclassified',
        occurrences: 5,
        first_seen: '2026-06-01T00:00:00.000Z',
        last_seen: '2026-07-01T00:00:00.000Z',
      },
    ]);
  });
});
