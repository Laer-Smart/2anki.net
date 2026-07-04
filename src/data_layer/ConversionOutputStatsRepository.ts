import type { Knex } from 'knex';

export interface ConversionOutputStatsRow {
  source: string;
  decks: number;
  cards: number;
  empty_back_cards: number;
  first_seen: string;
  last_seen: string;
}

export interface ConversionOutputDelta {
  decks: number;
  cards: number;
  emptyBack: number;
}

interface ConversionOutputUpsertRow {
  source: string;
  decks: number;
  cards: number;
  empty_back_cards: number;
}

export interface IConversionOutputStatsRepository {
  record(source: string, delta: ConversionOutputDelta): Promise<void>;
  list(): Promise<ConversionOutputStatsRow[]>;
}

const toIso = (value: unknown): string => {
  if (value instanceof Date) {
    return value.toISOString();
  }
  return String(value);
};

export class ConversionOutputStatsRepository implements IConversionOutputStatsRepository {
  private readonly table = 'conversion_output_stats';

  constructor(private readonly database: Knex) {}

  buildRecordQuery(row: ConversionOutputUpsertRow): Knex.QueryBuilder {
    return this.database(this.table)
      .insert(row)
      .onConflict('source')
      .merge({
        decks: this.database.raw('?? + excluded.decks', [
          `${this.table}.decks`,
        ]),
        cards: this.database.raw('?? + excluded.cards', [
          `${this.table}.cards`,
        ]),
        empty_back_cards: this.database.raw('?? + excluded.empty_back_cards', [
          `${this.table}.empty_back_cards`,
        ]),
        last_seen: this.database.fn.now(),
      });
  }

  async record(source: string, delta: ConversionOutputDelta): Promise<void> {
    await this.buildRecordQuery({
      source,
      decks: delta.decks,
      cards: delta.cards,
      empty_back_cards: delta.emptyBack,
    });
  }

  async list(): Promise<ConversionOutputStatsRow[]> {
    const rows = await this.database(this.table)
      .select(
        'source',
        'decks',
        'cards',
        'empty_back_cards',
        'first_seen',
        'last_seen'
      )
      .orderBy('cards', 'desc');
    return rows.map((row: Record<string, unknown>) => ({
      source: row.source as string,
      decks: Number(row.decks),
      cards: Number(row.cards),
      empty_back_cards: Number(row.empty_back_cards),
      first_seen: toIso(row.first_seen),
      last_seen: toIso(row.last_seen),
    }));
  }
}

export default ConversionOutputStatsRepository;
