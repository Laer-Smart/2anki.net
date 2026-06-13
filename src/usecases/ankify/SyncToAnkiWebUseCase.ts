import { AnkifyClientsRepositoryInterface } from '../../data_layer/ankify/AnkifyClientsRepository';
import { AnkiConnectFactory } from './GetAnkifyStatsUseCase';

export class NoActiveAnkifyClientForSyncError extends Error {
  constructor() {
    super('No active Ankify client');
    this.name = 'NoActiveAnkifyClientForSyncError';
  }
}

export class SyncToAnkiWebUseCase {
  constructor(
    private readonly clients: AnkifyClientsRepositoryInterface,
    private readonly ankiConnect: AnkiConnectFactory
  ) {}

  async execute(
    owner: number,
    options: { ankiConnectHost?: string } = {}
  ): Promise<void> {
    const client = await this.clients.findActiveByOwner(owner);
    if (client == null) {
      throw new NoActiveAnkifyClientForSyncError();
    }

    const ac = this.ankiConnect(
      options.ankiConnectHost ?? 'localhost',
      client.anki_port,
      client.anki_connect_api_key
    );

    await ac.ping();
    await ac.sync();
  }
}
