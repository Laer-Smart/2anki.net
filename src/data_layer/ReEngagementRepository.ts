import type { Knex } from 'knex';

export interface IReEngagementRepository {
  hasBeenSent(userId: number): Promise<boolean>;
  recordSend(userId: number, token: string): Promise<number>;
  saveResponse(
    emailId: number,
    stoppedReason: string,
    contentType: string,
    comment: string | null
  ): Promise<void>;
  findByToken(token: string): Promise<{ id: number; userId: number } | null>;
  getUsersToEmail(): Promise<
    Array<{ id: number; name: string; email: string }>
  >;
}

interface EmailRow {
  id: number;
  user_id: number;
}

interface UserRow {
  id: number;
  name: string;
  email: string;
}

export class ReEngagementRepository implements IReEngagementRepository {
  private readonly emailsTable = 're_engagement_emails';
  private readonly feedbackTable = 're_engagement_feedback';

  constructor(private readonly database: Knex) {}

  async hasBeenSent(userId: number): Promise<boolean> {
    const row = await this.database(this.emailsTable)
      .where({ user_id: userId })
      .first();
    return row != null;
  }

  async recordSend(userId: number, token: string): Promise<number> {
    const [row] = await this.database(this.emailsTable)
      .insert({ user_id: userId, token })
      .returning('id');
    return typeof row === 'object' ? row.id : row;
  }

  async saveResponse(
    emailId: number,
    stoppedReason: string,
    contentType: string,
    comment: string | null
  ): Promise<void> {
    await this.database(this.feedbackTable).insert({
      email_id: emailId,
      stopped_reason: stoppedReason,
      content_type: contentType,
      comment,
    });
  }

  async findByToken(
    token: string
  ): Promise<{ id: number; userId: number } | null> {
    const reEngagementRow = await this.database<EmailRow>(this.emailsTable)
      .select('id', 'user_id')
      .where('token', token)
      .first();
    if (reEngagementRow != null) {
      return { id: reEngagementRow.id, userId: reEngagementRow.user_id };
    }

    const inactivityRow = await this.database<EmailRow>('inactivity_emails')
      .select('id', 'user_id')
      .where('token', token)
      .first();
    if (inactivityRow != null) {
      return { id: inactivityRow.id, userId: inactivityRow.user_id };
    }

    const priceLockInRow = await this.database<EmailRow>('price_lock_in_emails')
      .select('id', 'user_id')
      .where('token', token)
      .first();
    if (priceLockInRow != null) {
      return { id: priceLockInRow.id, userId: priceLockInRow.user_id };
    }

    const abandonedRow = await this.database(
      'abandoned_checkout_recovery_emails'
    )
      .select('users.id as user_id')
      .join(
        'users',
        'users.email',
        'abandoned_checkout_recovery_emails.user_email'
      )
      .where('abandoned_checkout_recovery_emails.token', token)
      .first<{ user_id: number }>();
    if (abandonedRow != null) {
      return { id: abandonedRow.user_id, userId: abandonedRow.user_id };
    }

    const passWinbackRow = await this.database<EmailRow>(
      'pass_winback_notifications'
    )
      .select('id', 'user_id')
      .where('token', token)
      .first();
    if (passWinbackRow == null) {
      return null;
    }
    return { id: passWinbackRow.id, userId: passWinbackRow.user_id };
  }

  async getUsersToEmail(): Promise<
    Array<{ id: number; name: string; email: string }>
  > {
    const rows = await this.database<UserRow>('users')
      .select('users.id', 'users.name', 'users.email')
      .whereRaw(
        "users.created_at >= now() - interval '4 days' AND users.created_at < now() - interval '3 days'"
      )
      .whereNotExists(
        this.database('uploads').whereRaw('uploads.owner = users.id').limit(1)
      )
      .whereNotExists(
        this.database(this.emailsTable)
          .whereRaw('re_engagement_emails.user_id = users.id')
          .limit(1)
      )
      .whereNotExists(
        this.database('email_preferences')
          .whereRaw('email_preferences.user_id = users.id')
          .where('email_preferences.marketing_opt_out', true)
          .limit(1)
      )
      .limit(500);
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
    }));
  }
}

export class InMemoryReEngagementRepository implements IReEngagementRepository {
  private readonly sentUserIds = new Set<number>();
  private emails: Array<{ id: number; userId: number; token: string }> = [];
  private responses: Array<{
    emailId: number;
    stoppedReason: string;
    contentType: string;
    comment: string | null;
  }> = [];
  private nextId = 1;
  private usersToReturn: Array<{
    id: number;
    name: string;
    email: string;
  }> = [];

  seedUsers(users: Array<{ id: number; name: string; email: string }>): void {
    this.usersToReturn = users;
  }

  async hasBeenSent(userId: number): Promise<boolean> {
    return this.sentUserIds.has(userId);
  }

  async recordSend(userId: number, token: string): Promise<number> {
    const id = this.nextId++;
    this.emails.push({ id, userId, token });
    this.sentUserIds.add(userId);
    return id;
  }

  async saveResponse(
    emailId: number,
    stoppedReason: string,
    contentType: string,
    comment: string | null
  ): Promise<void> {
    this.responses.push({ emailId, stoppedReason, contentType, comment });
  }

  async findByToken(
    token: string
  ): Promise<{ id: number; userId: number } | null> {
    const found = this.emails.find((e) => e.token === token);
    if (found == null) {
      return null;
    }
    return { id: found.id, userId: found.userId };
  }

  async getUsersToEmail(): Promise<
    Array<{ id: number; name: string; email: string }>
  > {
    return this.usersToReturn.filter((u) => !this.sentUserIds.has(u.id));
  }

  getResponses() {
    return [...this.responses];
  }

  getEmails() {
    return [...this.emails];
  }

  clear(): void {
    this.sentUserIds.clear();
    this.emails = [];
    this.responses = [];
    this.nextId = 1;
    this.usersToReturn = [];
  }
}

export default ReEngagementRepository;
