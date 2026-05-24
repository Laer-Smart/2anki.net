import { Knex } from 'knex';

export interface UsageCounters {
  cards_used_this_month: number;
  cards_month_started_at: Date | null;
  pdf_prints_this_month: number;
  prints_month_started_at: Date | null;
}

const TABLE = 'deleted_user_usage';
const EPOCH = "'1970-01-01'::timestamptz";

function takeLaterMonthValue(col: string): string {
  return `CASE
      WHEN date_trunc('month', COALESCE(EXCLUDED.${col}, ${EPOCH}))
           > date_trunc('month', COALESCE(${TABLE}.${col}, ${EPOCH}))
        THEN EXCLUDED.${col}
      ELSE ${TABLE}.${col}
    END`;
}

function mergeUsageAcrossMonths(usageCol: string, monthCol: string): string {
  return `CASE
      WHEN date_trunc('month', COALESCE(EXCLUDED.${monthCol}, ${EPOCH}))
           > date_trunc('month', COALESCE(${TABLE}.${monthCol}, ${EPOCH}))
        THEN EXCLUDED.${usageCol}
      WHEN date_trunc('month', COALESCE(EXCLUDED.${monthCol}, ${EPOCH}))
           = date_trunc('month', COALESCE(${TABLE}.${monthCol}, ${EPOCH}))
        THEN GREATEST(EXCLUDED.${usageCol}, ${TABLE}.${usageCol})
      ELSE ${TABLE}.${usageCol}
    END`;
}

function isCurrentMonth(value: Date | string | null, now: Date): boolean {
  if (value == null) return false;
  const d = typeof value === 'string' ? new Date(value) : value;
  return (
    d.getUTCFullYear() === now.getUTCFullYear() &&
    d.getUTCMonth() === now.getUTCMonth()
  );
}

function toDate(value: Date | string | null): Date | null {
  if (value == null) return null;
  return typeof value === 'string' ? new Date(value) : value;
}

export class DeletedUserUsageRepository {
  constructor(private database: Knex) {}

  async snapshot(
    emailSha256: string,
    counters: UsageCounters,
    trx?: Knex.Transaction
  ): Promise<void> {
    const db = trx ?? this.database;
    await db(TABLE)
      .insert({
        email_sha256: emailSha256,
        cards_used_this_month: counters.cards_used_this_month,
        cards_month_started_at: counters.cards_month_started_at,
        pdf_prints_this_month: counters.pdf_prints_this_month,
        prints_month_started_at: counters.prints_month_started_at,
        deleted_at: db.fn.now(),
      })
      .onConflict('email_sha256')
      .merge({
        cards_used_this_month: db.raw(
          mergeUsageAcrossMonths('cards_used_this_month', 'cards_month_started_at')
        ),
        cards_month_started_at: db.raw(
          takeLaterMonthValue('cards_month_started_at')
        ),
        pdf_prints_this_month: db.raw(
          mergeUsageAcrossMonths('pdf_prints_this_month', 'prints_month_started_at')
        ),
        prints_month_started_at: db.raw(
          takeLaterMonthValue('prints_month_started_at')
        ),
        deleted_at: db.raw(`GREATEST(EXCLUDED.deleted_at, ${TABLE}.deleted_at)`),
      });
  }

  async consumeIfCurrentMonth(
    emailSha256: string,
    now: Date,
    trx?: Knex.Transaction
  ): Promise<UsageCounters | null> {
    const db = trx ?? this.database;
    const row = await db(TABLE).where({ email_sha256: emailSha256 }).first();
    if (!row) return null;
    await db(TABLE).where({ email_sha256: emailSha256 }).del();

    const seed: UsageCounters = {
      cards_used_this_month: 0,
      cards_month_started_at: null,
      pdf_prints_this_month: 0,
      prints_month_started_at: null,
    };
    if (isCurrentMonth(row.cards_month_started_at, now)) {
      seed.cards_used_this_month = row.cards_used_this_month ?? 0;
      seed.cards_month_started_at = toDate(row.cards_month_started_at);
    }
    if (isCurrentMonth(row.prints_month_started_at, now)) {
      seed.pdf_prints_this_month = row.pdf_prints_this_month ?? 0;
      seed.prints_month_started_at = toDate(row.prints_month_started_at);
    }
    if (
      seed.cards_month_started_at == null &&
      seed.prints_month_started_at == null
    ) {
      return null;
    }
    return seed;
  }
}

export default DeletedUserUsageRepository;
