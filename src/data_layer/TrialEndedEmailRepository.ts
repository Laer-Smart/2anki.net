import type { Knex } from 'knex';
import { TRIAL_DURATION_MS } from '../lib/User/trialAccess';

const LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000;

export interface TrialLapsedUser {
  id: number;
  name: string;
  email: string;
  trialStartedAt: Date;
}

export interface ITrialEndedEmailRepository {
  getUsersToNotify(limit?: number, now?: Date): Promise<TrialLapsedUser[]>;
  countDecksInTrialWindow(userId: number, trialStartedAt: Date): Promise<number>;
  recordSend(userId: number, token: string): Promise<void>;
  findByToken(token: string): Promise<{ id: number; userId: number } | null>;
}

interface UserRow {
  id: number;
  name: string;
  email: string;
  trial_started_at: Date;
}

interface TrialEndedEmailRow {
  id: number;
  user_id: number;
}

export class TrialEndedEmailRepository implements ITrialEndedEmailRepository {
  private readonly table = 'trial_ended_emails';

  constructor(private readonly database: Knex) {}

  async getUsersToNotify(limit = 500, now = new Date()): Promise<TrialLapsedUser[]> {
    const lapsedBefore = new Date(now.getTime() - TRIAL_DURATION_MS);
    const lookbackAfter = new Date(now.getTime() - LOOKBACK_MS);

    const rows = await this.database<UserRow>('users')
      .select('users.id', 'users.name', 'users.email', 'users.trial_started_at')
      .whereNotNull('users.trial_started_at')
      .where('users.trial_started_at', '<=', lapsedBefore)
      .where('users.trial_started_at', '>', lookbackAfter)
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
        this.database(this.table)
          .whereRaw('trial_ended_emails.user_id = users.id')
          .limit(1)
      )
      .whereNotExists(
        this.database('email_preferences')
          .whereRaw('email_preferences.user_id = users.id')
          .where('email_preferences.marketing_opt_out', true)
          .limit(1)
      )
      .limit(limit);

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      trialStartedAt: row.trial_started_at,
    }));
  }

  async countDecksInTrialWindow(userId: number, trialStartedAt: Date): Promise<number> {
    const windowEnd = new Date(trialStartedAt.getTime() + TRIAL_DURATION_MS);
    const [row] = await this.database('uploads')
      .where({ owner: userId })
      .whereNotNull('filename')
      .where('created_at', '>=', trialStartedAt)
      .where('created_at', '<', windowEnd)
      .count<Array<{ count: string }>>({ count: '*' });
    return Number(row?.count ?? 0);
  }

  async recordSend(userId: number, token: string): Promise<void> {
    await this.database(this.table).insert({ user_id: userId, token });
  }

  async findByToken(token: string): Promise<{ id: number; userId: number } | null> {
    const row = await this.database<TrialEndedEmailRow>(this.table)
      .select('id', 'user_id')
      .where({ token })
      .first();
    if (row == null) {
      return null;
    }
    return { id: row.id, userId: row.user_id };
  }
}

export class InMemoryTrialEndedEmailRepository implements ITrialEndedEmailRepository {
  private usersToReturn: TrialLapsedUser[] = [];
  private readonly sentUserIds = new Set<number>();
  private readonly deckCounts = new Map<number, number>();
  private emails: Array<{ id: number; userId: number; token: string }> = [];
  private nextId = 1;

  seedUsers(users: TrialLapsedUser[]): void {
    this.usersToReturn = users;
  }

  seedDeckCount(userId: number, count: number): void {
    this.deckCounts.set(userId, count);
  }

  async getUsersToNotify(limit = 500): Promise<TrialLapsedUser[]> {
    return this.usersToReturn
      .filter((user) => !this.sentUserIds.has(user.id))
      .slice(0, limit);
  }

  async countDecksInTrialWindow(userId: number): Promise<number> {
    return this.deckCounts.get(userId) ?? 0;
  }

  async recordSend(userId: number, token: string): Promise<void> {
    const id = this.nextId++;
    this.emails.push({ id, userId, token });
    this.sentUserIds.add(userId);
  }

  async findByToken(token: string): Promise<{ id: number; userId: number } | null> {
    const found = this.emails.find((email) => email.token === token);
    if (found == null) {
      return null;
    }
    return { id: found.id, userId: found.userId };
  }

  getSentUserIds(): ReadonlySet<number> {
    return this.sentUserIds;
  }
}

export default TrialEndedEmailRepository;
