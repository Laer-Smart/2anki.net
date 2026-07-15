import type { Knex } from 'knex';

export interface BehavioralDropoffCounts {
  signupsWithoutFirstUpload: number;
  failedConversions: number;
  zeroCardConversions: number;
}

export interface IBehavioralDropoffRepository {
  counts(since: Date): Promise<BehavioralDropoffCounts>;
}

const NOTION_CONVERSION_TYPES: string[] = ['page', 'database', 'conversion'];

const PLAN_LIMIT_REASON_PATTERN = '%"code":"monthly_limit"%';

function toCount(row: { count?: number | string } | undefined): number {
  return row?.count == null ? 0 : Number(row.count);
}

export class BehavioralDropoffRepository implements IBehavioralDropoffRepository {
  constructor(private readonly database: Knex) {}

  buildSignupsWithoutFirstUploadQuery(since: Date): Knex.QueryBuilder {
    const signups = this.database('events')
      .distinct('user_id')
      .where('name', 'account_created')
      .where('created_at', '>=', since)
      .whereNotNull('user_id')
      .as('signups');

    return this.database
      .from(signups)
      .whereNotExists(
        this.database('events as uploads')
          .select(this.database.raw('1'))
          .where('uploads.name', 'upload_started')
          .whereRaw('uploads.user_id = signups.user_id')
      )
      .count('* as count');
  }

  buildFailedConversionsQuery(since: Date): Knex.QueryBuilder {
    return this.database('jobs')
      .where('jobs.status', 'failed')
      .where('jobs.created_at', '>=', since)
      .whereIn('jobs.type', NOTION_CONVERSION_TYPES)
      .whereRaw(
        '(jobs.job_reason_failure IS NULL OR jobs.job_reason_failure NOT LIKE ?)',
        [PLAN_LIMIT_REASON_PATTERN]
      )
      .count('jobs.id as count');
  }

  buildZeroCardConversionsQuery(since: Date): Knex.QueryBuilder {
    return this.database('jobs')
      .where('jobs.status', 'done')
      .where('jobs.created_at', '>=', since)
      .whereIn('jobs.type', NOTION_CONVERSION_TYPES)
      .where('jobs.card_count', 0)
      .count('jobs.id as count');
  }

  async counts(since: Date): Promise<BehavioralDropoffCounts> {
    const [signups, failed, zeroCard] = await Promise.all([
      this.buildSignupsWithoutFirstUploadQuery(since).first(),
      this.buildFailedConversionsQuery(since).first(),
      this.buildZeroCardConversionsQuery(since).first(),
    ]);

    return {
      signupsWithoutFirstUpload: toCount(signups),
      failedConversions: toCount(failed),
      zeroCardConversions: toCount(zeroCard),
    };
  }
}

export default BehavioralDropoffRepository;
