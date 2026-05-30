import { Knex } from 'knex';

export type SurveyStatus = 'answered' | 'dismissed';

export interface UserSurveyData {
  improvement: string | null;
  studying: string | null;
  status: SurveyStatus;
}

export interface IUserSurveyRepository {
  upsert(
    userId: string,
    surveyKey: string,
    data: UserSurveyData
  ): Promise<void>;
  findByUserAndKey(
    userId: string,
    surveyKey: string
  ): Promise<{ id: number } | undefined>;
}

export class UserSurveyRepository implements IUserSurveyRepository {
  constructor(private readonly db: Knex) {}

  async upsert(
    userId: string,
    surveyKey: string,
    data: UserSurveyData
  ): Promise<void> {
    await this.db('user_surveys')
      .insert({
        user_id: userId,
        survey_key: surveyKey,
        improvement: data.improvement,
        studying: data.studying,
        status: data.status,
      })
      .onConflict(['user_id', 'survey_key'])
      .merge({
        improvement: data.improvement,
        studying: data.studying,
        status: data.status,
        updated_at: new Date(),
      });
  }

  async findByUserAndKey(
    userId: string,
    surveyKey: string
  ): Promise<{ id: number } | undefined> {
    const row = await this.db('user_surveys')
      .where({ user_id: userId, survey_key: surveyKey })
      .first();
    if (row == null) {
      return undefined;
    }
    return { id: row.id };
  }
}

export class InMemoryUserSurveyRepository implements IUserSurveyRepository {
  private readonly rows = new Map<
    string,
    { id: number; data: UserSurveyData }
  >();

  private nextId = 1;

  private key(userId: string, surveyKey: string): string {
    return `${userId}::${surveyKey}`;
  }

  async upsert(
    userId: string,
    surveyKey: string,
    data: UserSurveyData
  ): Promise<void> {
    const compositeKey = this.key(userId, surveyKey);
    const existing = this.rows.get(compositeKey);
    if (existing != null) {
      this.rows.set(compositeKey, { id: existing.id, data });
      return;
    }
    this.rows.set(compositeKey, { id: this.nextId, data });
    this.nextId += 1;
  }

  async findByUserAndKey(
    userId: string,
    surveyKey: string
  ): Promise<{ id: number } | undefined> {
    const existing = this.rows.get(this.key(userId, surveyKey));
    if (existing == null) {
      return undefined;
    }
    return { id: existing.id };
  }

  getData(userId: string, surveyKey: string): UserSurveyData | undefined {
    return this.rows.get(this.key(userId, surveyKey))?.data;
  }

  count(): number {
    return this.rows.size;
  }
}
