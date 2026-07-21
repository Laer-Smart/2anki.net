import type { Knex } from 'knex';

export interface ApiKeyUsageMonth {
  cards: number;
  warned_at: Date | null;
}

export interface IApiKeyUsageRepository {
  getMonth(userId: number, month: Date): Promise<ApiKeyUsageMonth>;
  incrementCards(userId: number, month: Date, cards: number): Promise<number>;
  markWarned(userId: number, month: Date): Promise<void>;
}

function toMonthKey(month: Date): string {
  const year = month.getUTCFullYear();
  const monthIndex = String(month.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${monthIndex}-01`;
}

export class ApiKeyUsageRepository implements IApiKeyUsageRepository {
  private readonly table = 'api_key_usage';

  constructor(private readonly database: Knex) {}

  async getMonth(userId: number, month: Date): Promise<ApiKeyUsageMonth> {
    const row = await this.database(this.table)
      .where({ user_id: userId, month: toMonthKey(month) })
      .select('cards', 'warned_at')
      .first();
    if (row == null) {
      return { cards: 0, warned_at: null };
    }
    return {
      cards: Number(row.cards),
      warned_at: row.warned_at == null ? null : new Date(row.warned_at),
    };
  }

  async incrementCards(
    userId: number,
    month: Date,
    cards: number
  ): Promise<number> {
    const rows = await this.database(this.table)
      .insert({ user_id: userId, month: toMonthKey(month), cards })
      .onConflict(['user_id', 'month'])
      .merge({ cards: this.database.raw('api_key_usage.cards + ?', [cards]) })
      .returning('cards');
    return Number(rows[0]?.cards ?? cards);
  }

  async markWarned(userId: number, month: Date): Promise<void> {
    await this.database(this.table)
      .where({ user_id: userId, month: toMonthKey(month) })
      .whereNull('warned_at')
      .update({ warned_at: this.database.fn.now() });
  }
}

export default ApiKeyUsageRepository;
