import type { Knex } from 'knex';

export interface IEmailPreferencesRepository {
  isOptedOut(userId: number): Promise<boolean>;
  optOut(userId: number): Promise<void>;
  optIn(userId: number): Promise<void>;
}

export class EmailPreferencesRepository implements IEmailPreferencesRepository {
  private readonly table = 'email_preferences';

  constructor(private readonly database: Knex) {}

  async isOptedOut(userId: number): Promise<boolean> {
    const row = await this.database(this.table)
      .where({ user_id: userId })
      .first();
    if (row == null) {
      return false;
    }
    return row.marketing_opt_out === true;
  }

  async optOut(userId: number): Promise<void> {
    await this.database(this.table)
      .insert({ user_id: userId, marketing_opt_out: true })
      .onConflict('user_id')
      .merge({ marketing_opt_out: true, updated_at: this.database.fn.now() });
  }

  async optIn(userId: number): Promise<void> {
    await this.database(this.table)
      .insert({ user_id: userId, marketing_opt_out: false })
      .onConflict('user_id')
      .merge({ marketing_opt_out: false, updated_at: this.database.fn.now() });
  }
}

export class InMemoryEmailPreferencesRepository implements IEmailPreferencesRepository {
  private readonly prefs = new Map<number, boolean>();

  async isOptedOut(userId: number): Promise<boolean> {
    return this.prefs.get(userId) === true;
  }

  async optOut(userId: number): Promise<void> {
    this.prefs.set(userId, true);
  }

  async optIn(userId: number): Promise<void> {
    this.prefs.set(userId, false);
  }

  clear(): void {
    this.prefs.clear();
  }
}

export default EmailPreferencesRepository;
