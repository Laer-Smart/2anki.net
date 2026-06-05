import { Knex } from 'knex';

import {
  AnkifyClient,
  AnkifyClientStatus,
  NewAnkifyClient,
} from '../../entities/ankify';

const TABLE = 'ankify_clients';

export interface AnkifyClientsRepositoryInterface {
  create(input: NewAnkifyClient): Promise<AnkifyClient>;
  listByOwner(owner: number): Promise<AnkifyClient[]>;
  findActiveById(id: number, owner: number): Promise<AnkifyClient | null>;
  findActiveByOwner(owner: number): Promise<AnkifyClient | null>;
  setStatus(id: number, status: AnkifyClientStatus): Promise<void>;
  deleteById(id: number): Promise<void>;
  touchLastActiveAt(id: number): Promise<void>;
  reservedPorts(): Promise<number[]>;
  listIdleSince(cutoff: Date): Promise<AnkifyClient[]>;
}

export class AnkifyClientsRepository implements AnkifyClientsRepositoryInterface {
  constructor(private readonly database: Knex) {}

  async create(input: NewAnkifyClient): Promise<AnkifyClient> {
    const [row] = await this.database(TABLE)
      .insert({
        owner: input.owner,
        container_id: input.container_id,
        container_name: input.container_name,
        anki_port: input.anki_port,
        vnc_port: input.vnc_port,
        novnc_port: input.novnc_port,
        anki_connect_api_key: input.anki_connect_api_key,
      })
      .returning<AnkifyClient[]>('*');
    return row;
  }

  listByOwner(owner: number): Promise<AnkifyClient[]> {
    return this.database<AnkifyClient>(TABLE)
      .select('*')
      .where({ owner })
      .orderBy('created_at', 'desc');
  }

  async findActiveById(
    id: number,
    owner: number
  ): Promise<AnkifyClient | null> {
    const row = await this.database<AnkifyClient>(TABLE)
      .select('*')
      .where({ id, owner, status: 'active' })
      .first();
    return row ?? null;
  }

  async findActiveByOwner(owner: number): Promise<AnkifyClient | null> {
    const row = await this.database<AnkifyClient>(TABLE)
      .select('*')
      .where({ owner, status: 'active' })
      .first();
    return row ?? null;
  }

  async setStatus(id: number, status: AnkifyClientStatus): Promise<void> {
    await this.database(TABLE).update({ status }).where({ id });
  }

  async deleteById(id: number): Promise<void> {
    await this.database(TABLE).delete().where({ id });
  }

  async touchLastActiveAt(id: number): Promise<void> {
    await this.database(TABLE)
      .update({ last_active_at: this.database.fn.now() })
      .where({ id });
  }

  async reservedPorts(): Promise<number[]> {
    const rows = await this.database<AnkifyClient>(TABLE)
      .select('anki_port', 'novnc_port')
      .where({ status: 'active' });
    const ports: number[] = [];
    for (const row of rows) {
      ports.push(row.anki_port, row.novnc_port);
    }
    return ports;
  }

  listIdleSince(cutoff: Date): Promise<AnkifyClient[]> {
    return this.database<AnkifyClient>(TABLE)
      .select('*')
      .where({ status: 'active' })
      .andWhere('last_active_at', '<', cutoff);
  }
}
