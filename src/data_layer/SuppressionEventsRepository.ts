import type { Knex } from 'knex';

export type SuppressionEventType =
  | 'bounce'
  | 'dropped'
  | 'spamreport'
  | 'blocked'
  | 'deferred'
  | 'delivered'
  | 'unsubscribe';

const HARD_SUPPRESSION_TYPES: ReadonlySet<string> = new Set([
  'bounce',
  'dropped',
  'spamreport',
  'blocked',
]);

export function isHardSuppressionType(eventType: string): boolean {
  return HARD_SUPPRESSION_TYPES.has(eventType);
}

export interface RecordSuppressionEvent {
  emailHash: string;
  eventType: string;
  sgEventId: string;
  eventAt: Date;
}

export class DuplicateSuppressionEventError extends Error {
  constructor(readonly sgEventId: string) {
    super('Suppression event already recorded');
    this.name = 'DuplicateSuppressionEventError';
  }
}

export interface ISuppressionEventsRepository {
  record(input: RecordSuppressionEvent): Promise<void>;
  isSuppressed(emailHash: string): Promise<boolean>;
}

interface LatestEventRow {
  event_type: string;
}

export class SuppressionEventsRepository implements ISuppressionEventsRepository {
  private readonly table = 'suppression_events';

  constructor(private readonly database: Knex) {}

  async record(input: RecordSuppressionEvent): Promise<void> {
    try {
      await this.database(this.table).insert({
        email_hash: input.emailHash,
        event_type: input.eventType,
        sg_event_id: input.sgEventId,
        event_at: input.eventAt,
      });
    } catch (err: unknown) {
      const pgErr = err as { code?: string };
      if (pgErr.code === '23505') {
        throw new DuplicateSuppressionEventError(input.sgEventId);
      }
      throw err;
    }
  }

  async isSuppressed(emailHash: string): Promise<boolean> {
    const row = await this.database<LatestEventRow>(this.table)
      .where('email_hash', emailHash)
      .orderBy('event_at', 'desc')
      .limit(1)
      .select('event_type')
      .first();
    if (row == null) {
      return false;
    }
    return isHardSuppressionType(row.event_type);
  }
}

export class InMemorySuppressionEventsRepository implements ISuppressionEventsRepository {
  private readonly rows: RecordSuppressionEvent[] = [];

  async record(input: RecordSuppressionEvent): Promise<void> {
    const duplicate = this.rows.some((r) => r.sgEventId === input.sgEventId);
    if (duplicate) {
      throw new DuplicateSuppressionEventError(input.sgEventId);
    }
    this.rows.push({ ...input });
  }

  async isSuppressed(emailHash: string): Promise<boolean> {
    const latest = this.rows
      .filter((r) => r.emailHash === emailHash)
      .sort((a, b) => b.eventAt.getTime() - a.eventAt.getTime())[0];
    if (latest == null) {
      return false;
    }
    return isHardSuppressionType(latest.eventType);
  }

  clear(): void {
    this.rows.length = 0;
  }
}

export default SuppressionEventsRepository;
