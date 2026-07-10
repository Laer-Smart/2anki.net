import type { Knex } from 'knex';

export interface PausedSubscriptionRow {
  email: string;
  linked_email: string | null;
  payload: unknown;
}

export interface IPauseResumeWarningRepository {
  findPausedResumingBetween(
    fromEpochSeconds: number,
    toEpochSeconds: number
  ): Promise<PausedSubscriptionRow[]>;
  wasSent(subscriptionEmail: string, resumesAt: Date): Promise<boolean>;
  markSent(subscriptionEmail: string, resumesAt: Date): Promise<void>;
}

export class PauseResumeWarningRepository implements IPauseResumeWarningRepository {
  constructor(private readonly database: Knex) {}

  buildPausedResumingQuery(
    fromEpochSeconds: number,
    toEpochSeconds: number
  ): Knex.QueryBuilder {
    return this.database('subscriptions')
      .select('email', 'linked_email', 'payload')
      .whereRaw(
        "(payload::jsonb #>> '{pause_collection,resumes_at}')::bigint between ? and ?",
        [fromEpochSeconds, toEpochSeconds]
      );
  }

  async findPausedResumingBetween(
    fromEpochSeconds: number,
    toEpochSeconds: number
  ): Promise<PausedSubscriptionRow[]> {
    return (await this.buildPausedResumingQuery(
      fromEpochSeconds,
      toEpochSeconds
    )) as PausedSubscriptionRow[];
  }

  async wasSent(subscriptionEmail: string, resumesAt: Date): Promise<boolean> {
    const row = await this.database('pause_resume_warning_notices')
      .where({ subscription_email: subscriptionEmail })
      .where({ resumes_at: resumesAt })
      .first();
    return row != null;
  }

  async markSent(subscriptionEmail: string, resumesAt: Date): Promise<void> {
    await this.database('pause_resume_warning_notices')
      .insert({
        subscription_email: subscriptionEmail,
        resumes_at: resumesAt,
      })
      .onConflict(['subscription_email', 'resumes_at'])
      .ignore();
  }
}

export default PauseResumeWarningRepository;
