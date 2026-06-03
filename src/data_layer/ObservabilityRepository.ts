import type { Knex } from 'knex';

export interface RequestLogRow {
  method: string;
  route: string;
  status_code: number;
  duration_ms: number;
  created_at: Date;
}

export interface OutboundCallLogRow {
  service: string;
  endpoint: string;
  status_code: number | null;
  duration_ms: number;
  created_at: Date;
}

export interface AggregatedRequestRow {
  bucket: Date;
  status_class: '2xx' | '3xx' | '4xx' | '5xx';
  count: number;
}

export interface RouteLatencyRow {
  method: string;
  route: string;
  avg_ms: number;
  p95_ms: number;
  count: number;
}

export interface OutboundCallBucketRow {
  bucket: Date;
  service: string;
  count: number;
}

export interface RouteErrorRateRow {
  method: string;
  route: string;
  total: number;
  errors: number;
}

export interface ServiceErrorRateRow {
  service: string;
  total: number;
  errors: number;
}

export interface ServiceLatencyRow {
  service: string;
  p50_ms: number;
  p95_ms: number;
  p99_ms: number;
  count: number;
}

export interface DeletedLogCounts {
  requestLogs: number;
  outboundCallLogs: number;
}

export interface IObservabilityRepository {
  insertRequestLogs(rows: RequestLogRow[]): Promise<void>;
  insertOutboundCallLogs(rows: OutboundCallLogRow[]): Promise<void>;
  deleteOlderThan(days: number): Promise<DeletedLogCounts>;
  aggregateInboundByStatusClass(
    fromTime: Date,
    bucketSeconds: number
  ): Promise<AggregatedRequestRow[]>;
  topRoutesByLatency(fromTime: Date, limit: number): Promise<RouteLatencyRow[]>;
  aggregateOutboundByService(
    fromTime: Date,
    bucketSeconds: number
  ): Promise<OutboundCallBucketRow[]>;
  outboundLatencyByService(
    fromTime: Date,
    limit: number
  ): Promise<ServiceLatencyRow[]>;
  errorRateByRoute(fromTime: Date, limit: number): Promise<RouteErrorRateRow[]>;
  errorRateByService(
    fromTime: Date,
    limit: number
  ): Promise<ServiceErrorRateRow[]>;
}

export class ObservabilityRepository implements IObservabilityRepository {
  private readonly requestTable = 'request_logs';

  private readonly outboundTable = 'outbound_call_logs';

  constructor(private readonly database: Knex) {}

  async insertRequestLogs(rows: RequestLogRow[]): Promise<void> {
    if (rows.length === 0) return;
    await this.database(this.requestTable).insert(rows);
  }

  async insertOutboundCallLogs(rows: OutboundCallLogRow[]): Promise<void> {
    if (rows.length === 0) return;
    await this.database(this.outboundTable).insert(rows);
  }

  async deleteOlderThan(days: number): Promise<DeletedLogCounts> {
    const cutoff = this.database.raw('NOW() - make_interval(days => ?)', [days]);
    const requestLogs = await this.database(this.requestTable)
      .where('created_at', '<', cutoff)
      .del();
    const outboundCallLogs = await this.database(this.outboundTable)
      .where('created_at', '<', cutoff)
      .del();
    return { requestLogs, outboundCallLogs };
  }

  async aggregateInboundByStatusClass(
    fromTime: Date,
    bucketSeconds: number
  ): Promise<AggregatedRequestRow[]> {
    const result = await this.database
      .raw(
        `SELECT
           to_timestamp(floor(extract(epoch from created_at) / ?)::bigint * ?) AT TIME ZONE 'UTC' AS bucket,
           CASE
             WHEN status_code >= 500 THEN '5xx'
             WHEN status_code >= 400 THEN '4xx'
             WHEN status_code >= 300 THEN '3xx'
             ELSE '2xx'
           END AS status_class,
           COUNT(*)::int AS count
         FROM ${this.requestTable}
         WHERE created_at >= ?
         GROUP BY bucket, status_class
         ORDER BY bucket ASC`,
        [bucketSeconds, bucketSeconds, fromTime]
      );
    return (result.rows ?? []).map((r: { bucket: Date; status_class: string; count: number }) => ({
      bucket: new Date(r.bucket),
      status_class: r.status_class as '2xx' | '3xx' | '4xx' | '5xx',
      count: Number(r.count),
    }));
  }

  async topRoutesByLatency(
    fromTime: Date,
    limit: number
  ): Promise<RouteLatencyRow[]> {
    const result = await this.database.raw(
      `SELECT
         method,
         route,
         AVG(duration_ms)::float AS avg_ms,
         percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms)::float AS p95_ms,
         COUNT(*)::int AS count
       FROM ${this.requestTable}
       WHERE created_at >= ?
       GROUP BY method, route
       ORDER BY count DESC
       LIMIT ?`,
      [fromTime, limit]
    );
    return (result.rows ?? []).map(
      (r: { method: string; route: string; avg_ms: number; p95_ms: number; count: number }) => ({
        method: r.method,
        route: r.route,
        avg_ms: Math.round(Number(r.avg_ms)),
        p95_ms: Math.round(Number(r.p95_ms)),
        count: Number(r.count),
      })
    );
  }

  async aggregateOutboundByService(
    fromTime: Date,
    bucketSeconds: number
  ): Promise<OutboundCallBucketRow[]> {
    const result = await this.database.raw(
      `SELECT
         to_timestamp(floor(extract(epoch from created_at) / ?)::bigint * ?) AT TIME ZONE 'UTC' AS bucket,
         service,
         COUNT(*)::int AS count
       FROM ${this.outboundTable}
       WHERE created_at >= ?
       GROUP BY bucket, service
       ORDER BY bucket ASC`,
      [bucketSeconds, bucketSeconds, fromTime]
    );
    return (result.rows ?? []).map(
      (r: { bucket: Date; service: string; count: number }) => ({
        bucket: new Date(r.bucket),
        service: r.service,
        count: Number(r.count),
      })
    );
  }

  async outboundLatencyByService(
    fromTime: Date,
    limit: number
  ): Promise<ServiceLatencyRow[]> {
    const result = await this.database.raw(
      `SELECT
         service,
         percentile_disc(0.5) WITHIN GROUP (ORDER BY duration_ms)::int AS p50_ms,
         percentile_disc(0.95) WITHIN GROUP (ORDER BY duration_ms)::int AS p95_ms,
         percentile_disc(0.99) WITHIN GROUP (ORDER BY duration_ms)::int AS p99_ms,
         COUNT(*)::int AS count
       FROM ${this.outboundTable}
       WHERE created_at >= ?
       GROUP BY service
       ORDER BY count DESC
       LIMIT ?`,
      [fromTime, limit]
    );
    return (result.rows ?? []).map(
      (r: {
        service: string;
        p50_ms: number | null;
        p95_ms: number | null;
        p99_ms: number | null;
        count: number;
      }) => ({
        service: r.service,
        p50_ms: r.p50_ms == null ? 0 : Number(r.p50_ms),
        p95_ms: r.p95_ms == null ? 0 : Number(r.p95_ms),
        p99_ms: r.p99_ms == null ? 0 : Number(r.p99_ms),
        count: Number(r.count),
      })
    );
  }

  async errorRateByRoute(
    fromTime: Date,
    limit: number
  ): Promise<RouteErrorRateRow[]> {
    const result = await this.database.raw(
      `SELECT
         method,
         route,
         COUNT(*)::int AS total,
         SUM(CASE WHEN status_code < 200 OR status_code >= 300 THEN 1 ELSE 0 END)::int AS errors
       FROM ${this.requestTable}
       WHERE created_at >= ?
       GROUP BY method, route
       ORDER BY total DESC
       LIMIT ?`,
      [fromTime, limit]
    );
    return (result.rows ?? []).map(
      (r: { method: string; route: string; total: number; errors: number }) => ({
        method: r.method,
        route: r.route,
        total: Number(r.total),
        errors: Number(r.errors),
      })
    );
  }

  async errorRateByService(
    fromTime: Date,
    limit: number
  ): Promise<ServiceErrorRateRow[]> {
    const result = await this.database.raw(
      `SELECT
         service,
         COUNT(*)::int AS total,
         SUM(CASE WHEN status_code IS NULL OR status_code < 200 OR status_code >= 300 THEN 1 ELSE 0 END)::int AS errors
       FROM ${this.outboundTable}
       WHERE created_at >= ?
       GROUP BY service
       ORDER BY total DESC
       LIMIT ?`,
      [fromTime, limit]
    );
    return (result.rows ?? []).map(
      (r: { service: string; total: number; errors: number }) => ({
        service: r.service,
        total: Number(r.total),
        errors: Number(r.errors),
      })
    );
  }
}

export default ObservabilityRepository;
