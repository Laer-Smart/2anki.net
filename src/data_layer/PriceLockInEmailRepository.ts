import type { Knex } from 'knex';

export const PRICE_LOCK_IN_MIN_ACCOUNT_AGE_DAYS = 14;

export type PriceLockInVariant = 'a' | 'b';

export interface PriceLockInRecipient {
  id: number;
  email: string;
}

export interface IPriceLockInEmailRepository {
  getUsersToNotify(limit?: number): Promise<PriceLockInRecipient[]>;
  countUsersToNotify(): Promise<number>;
  recordSend(
    userId: number,
    token: string,
    variant: PriceLockInVariant
  ): Promise<void>;
  findByToken(token: string): Promise<{ id: number; userId: number } | null>;
}

interface UserRow {
  id: number;
  email: string;
}

interface EmailRow {
  id: number;
  user_id: number;
}

export class PriceLockInEmailRepository implements IPriceLockInEmailRepository {
  private readonly table = 'price_lock_in_emails';

  constructor(private readonly database: Knex) {}

  private buildSegmentQuery() {
    const now = new Date();
    const ageCutoff = new Date(
      now.getTime() - PRICE_LOCK_IN_MIN_ACCOUNT_AGE_DAYS * 24 * 60 * 60 * 1000
    );

    return this.database<UserRow>('users')
      .where('users.created_at', '<', ageCutoff.toISOString())
      .whereRaw('users.patreon IS NOT TRUE')
      .whereNotExists(
        this.database('subscriptions')
          .where('subscriptions.active', true)
          .whereRaw(
            '(subscriptions.email = users.email OR subscriptions.linked_email = users.email)'
          )
          .limit(1)
      )
      .whereNotExists(
        this.database('user_passes')
          .whereRaw('user_passes.user_id = users.id')
          .where('user_passes.expires_at', '>', now.toISOString())
          .limit(1)
      )
      .whereNotExists(
        this.database(this.table)
          .whereRaw('price_lock_in_emails.user_id = users.id')
          .limit(1)
      )
      .whereNotExists(
        this.database('email_preferences')
          .whereRaw('email_preferences.user_id = users.id')
          .where('email_preferences.marketing_opt_out', true)
          .limit(1)
      );
  }

  async getUsersToNotify(limit = 500): Promise<PriceLockInRecipient[]> {
    const rows = await this.buildSegmentQuery()
      .groupBy('users.email')
      .select('users.email')
      .min('users.id as id')
      .orderBy('users.email')
      .limit(limit);

    return rows.map((row) => ({ id: Number(row.id), email: row.email }));
  }

  async countUsersToNotify(): Promise<number> {
    const result = await this.buildSegmentQuery().countDistinct<
      { count: string | number }[]
    >('users.email as count');
    const raw = result[0]?.count ?? 0;
    return Number(raw);
  }

  async recordSend(
    userId: number,
    token: string,
    variant: PriceLockInVariant
  ): Promise<void> {
    await this.database(this.table).insert({
      user_id: userId,
      token,
      variant,
    });
  }

  async findByToken(
    token: string
  ): Promise<{ id: number; userId: number } | null> {
    const row = await this.database<EmailRow>(this.table)
      .select('id', 'user_id')
      .where('token', token)
      .first();
    if (row == null) {
      return null;
    }
    return { id: row.id, userId: row.user_id };
  }
}

export class InMemoryPriceLockInEmailRepository implements IPriceLockInEmailRepository {
  private usersToReturn: PriceLockInRecipient[] = [];
  private readonly sentUserIds = new Set<number>();
  private emails: Array<{
    id: number;
    userId: number;
    token: string;
    variant: PriceLockInVariant;
  }> = [];
  private nextId = 1;
  private readonly recordSendFailures = new Map<number, unknown>();

  seedUsers(users: PriceLockInRecipient[]): void {
    this.usersToReturn = users;
  }

  failRecordSendFor(userId: number, error: unknown): void {
    this.recordSendFailures.set(userId, error);
  }

  async getUsersToNotify(limit = 500): Promise<PriceLockInRecipient[]> {
    return this.usersToReturn
      .filter((u) => !this.sentUserIds.has(u.id))
      .slice(0, limit);
  }

  async countUsersToNotify(): Promise<number> {
    return this.usersToReturn.filter((u) => !this.sentUserIds.has(u.id)).length;
  }

  async recordSend(
    userId: number,
    token: string,
    variant: PriceLockInVariant
  ): Promise<void> {
    const failure = this.recordSendFailures.get(userId);
    if (failure != null) {
      throw failure;
    }
    const id = this.nextId++;
    this.emails.push({ id, userId, token, variant });
    this.sentUserIds.add(userId);
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

  getSentEmails() {
    return [...this.emails];
  }

  clear(): void {
    this.usersToReturn = [];
    this.sentUserIds.clear();
    this.emails = [];
    this.nextId = 1;
    this.recordSendFailures.clear();
  }
}

export default PriceLockInEmailRepository;
