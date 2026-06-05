import { Knex } from 'knex';

import {
  AnkifyExportSchedule,
  UpsertAnkifyExportSchedule,
} from '../../entities/ankify';

const TABLE = 'ankify_export_schedules';

export interface AnkifyExportSchedulesRepositoryInterface {
  findByOwner(owner: number): Promise<AnkifyExportSchedule | null>;
  upsertByOwner(
    input: UpsertAnkifyExportSchedule
  ): Promise<AnkifyExportSchedule>;
  deleteByOwner(owner: number): Promise<void>;
  listEnabled(): Promise<AnkifyExportSchedule[]>;
  markRun(id: number): Promise<void>;
}

export class AnkifyExportSchedulesRepository implements AnkifyExportSchedulesRepositoryInterface {
  constructor(private readonly database: Knex) {}

  async findByOwner(owner: number): Promise<AnkifyExportSchedule | null> {
    const row = await this.database<AnkifyExportSchedule>(TABLE)
      .select('*')
      .where({ owner })
      .first();
    return row ?? null;
  }

  async upsertByOwner(
    input: UpsertAnkifyExportSchedule
  ): Promise<AnkifyExportSchedule> {
    const [row] = await this.database<AnkifyExportSchedule>(TABLE)
      .insert({
        owner: input.owner,
        database_id: input.database_id,
        time_of_day: input.time_of_day,
        timezone: input.timezone,
        date_range_days: input.date_range_days,
        enabled: input.enabled,
        updated_at: this.database.fn.now() as unknown as Date,
      })
      .onConflict('owner')
      .merge({
        database_id: input.database_id,
        time_of_day: input.time_of_day,
        timezone: input.timezone,
        date_range_days: input.date_range_days,
        enabled: input.enabled,
        updated_at: this.database.fn.now() as unknown as Date,
      })
      .returning('*');
    return row;
  }

  async deleteByOwner(owner: number): Promise<void> {
    await this.database(TABLE).delete().where({ owner });
  }

  listEnabled(): Promise<AnkifyExportSchedule[]> {
    return this.database<AnkifyExportSchedule>(TABLE)
      .select('*')
      .where({ enabled: true });
  }

  async markRun(id: number): Promise<void> {
    await this.database(TABLE)
      .update({
        last_run_at: this.database.fn.now() as unknown as Date,
        updated_at: this.database.fn.now() as unknown as Date,
      })
      .where({ id });
  }
}
