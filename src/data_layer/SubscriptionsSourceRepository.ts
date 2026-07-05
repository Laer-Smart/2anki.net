import { Knex } from 'knex';

export interface ISubscriptionsSourceRepository {
  listPayloads(): Promise<unknown[]>;
}

export class SubscriptionsSourceRepository implements ISubscriptionsSourceRepository {
  constructor(private readonly database: Knex) {}

  async listPayloads(): Promise<unknown[]> {
    const rows = await this.database('subscriptions').select('payload');
    return rows.map((row) => (row as { payload: unknown }).payload);
  }
}

export class InMemorySubscriptionsSourceRepository implements ISubscriptionsSourceRepository {
  constructor(private readonly payloads: unknown[] = []) {}

  async listPayloads(): Promise<unknown[]> {
    return this.payloads;
  }
}
