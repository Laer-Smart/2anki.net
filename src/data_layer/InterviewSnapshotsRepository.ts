import { randomUUID } from 'crypto';

import type { Knex } from 'knex';

const SNAPSHOTS_TABLE = 'interview_snapshots';
const OPPORTUNITIES_TABLE = 'interview_opportunities';

export type OpportunityTag = 'opportunity' | 'insight';

export interface InterviewOpportunity {
  id: string;
  body: string;
  tag: OpportunityTag;
}

export interface InterviewSnapshot {
  id: string;
  participantName: string;
  memorableQuote: string;
  photoData: string | null;
  signupDate: string | null;
  planTier: string;
  usagePattern: string;
  source: string;
  experienceMapData: string | null;
  interviewDate: string;
  sessionLengthMinutes: number | null;
  createdAt: string;
  opportunities: InterviewOpportunity[];
}

export interface NewSnapshotInput {
  participantName: string;
  memorableQuote: string;
  photoData: string | null;
  signupDate: string | null;
  planTier: string;
  usagePattern: string;
  source: string;
  experienceMapData: string | null;
  interviewDate: string;
  sessionLengthMinutes: number | null;
  opportunities: Array<{ body: string; tag: OpportunityTag }>;
}

interface SnapshotRow {
  id: string;
  participant_name: string;
  memorable_quote: string;
  photo_data: string | null;
  signup_date: string | null;
  plan_tier: string;
  usage_pattern: string;
  source: string;
  experience_map_data: string | null;
  interview_date: string;
  session_length_minutes: number | null;
  created_at: Date | string;
}

interface OpportunityRow {
  id: string;
  snapshot_id: string;
  body: string;
  tag: string;
}

function toSnapshot(
  row: SnapshotRow,
  opportunities: InterviewOpportunity[]
): InterviewSnapshot {
  return {
    id: row.id,
    participantName: row.participant_name,
    memorableQuote: row.memorable_quote,
    photoData: row.photo_data,
    signupDate: row.signup_date,
    planTier: row.plan_tier,
    usagePattern: row.usage_pattern,
    source: row.source,
    experienceMapData: row.experience_map_data,
    interviewDate:
      typeof row.interview_date === 'string'
        ? row.interview_date.slice(0, 10)
        : row.interview_date,
    sessionLengthMinutes: row.session_length_minutes,
    createdAt:
      typeof row.created_at === 'string'
        ? row.created_at
        : (row.created_at as Date).toISOString(),
    opportunities,
  };
}

export class InterviewSnapshotsRepository {
  constructor(private readonly database: Knex) {}

  async list(): Promise<InterviewSnapshot[]> {
    const rows = await this.database<SnapshotRow>(SNAPSHOTS_TABLE).orderBy(
      'created_at',
      'desc'
    );
    if (rows.length === 0) return [];

    const ids = rows.map((r) => r.id);
    const oppRows = await this.database<OpportunityRow>(OPPORTUNITIES_TABLE)
      .whereIn('snapshot_id', ids)
      .orderBy('created_at', 'asc');

    const oppsBySnapshot = new Map<string, InterviewOpportunity[]>();
    for (const opp of oppRows) {
      const list = oppsBySnapshot.get(opp.snapshot_id) ?? [];
      list.push({ id: opp.id, body: opp.body, tag: opp.tag as OpportunityTag });
      oppsBySnapshot.set(opp.snapshot_id, list);
    }

    return rows.map((row) => toSnapshot(row, oppsBySnapshot.get(row.id) ?? []));
  }

  async create(input: NewSnapshotInput): Promise<InterviewSnapshot> {
    const snapshotId = randomUUID();
    const now = new Date();

    await this.database(SNAPSHOTS_TABLE).insert({
      id: snapshotId,
      participant_name: input.participantName,
      memorable_quote: input.memorableQuote,
      photo_data: input.photoData,
      signup_date: input.signupDate || null,
      plan_tier: input.planTier,
      usage_pattern: input.usagePattern,
      source: input.source,
      experience_map_data: input.experienceMapData,
      interview_date: input.interviewDate,
      session_length_minutes: input.sessionLengthMinutes,
      created_at: now,
      updated_at: now,
    });

    const opportunities: InterviewOpportunity[] = [];
    for (const opp of input.opportunities) {
      const oppId = randomUUID();
      await this.database(OPPORTUNITIES_TABLE).insert({
        id: oppId,
        snapshot_id: snapshotId,
        body: opp.body,
        tag: opp.tag,
        created_at: now,
      });
      opportunities.push({ id: oppId, body: opp.body, tag: opp.tag });
    }

    return {
      id: snapshotId,
      participantName: input.participantName,
      memorableQuote: input.memorableQuote,
      photoData: input.photoData,
      signupDate: input.signupDate,
      planTier: input.planTier,
      usagePattern: input.usagePattern,
      source: input.source,
      experienceMapData: input.experienceMapData,
      interviewDate: input.interviewDate,
      sessionLengthMinutes: input.sessionLengthMinutes,
      createdAt: now.toISOString(),
      opportunities,
    };
  }

  async remove(id: string): Promise<boolean> {
    const deleted = await this.database(SNAPSHOTS_TABLE).where({ id }).delete();
    return deleted > 0;
  }
}
