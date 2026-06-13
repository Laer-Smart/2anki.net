import { AnkifyClientsRepositoryInterface } from '../../data_layer/ankify/AnkifyClientsRepository';
import { AnkiConnectFactory } from './GetAnkifyStatsUseCase';

export class NoActiveAnkifyClientForProfileError extends Error {
  constructor() {
    super('No active Ankify client');
    this.name = 'NoActiveAnkifyClientForProfileError';
  }
}

export interface GetAnkifyActiveProfileResult {
  profile: string;
}

export class GetAnkifyActiveProfileUseCase {
  constructor(
    private readonly clients: AnkifyClientsRepositoryInterface,
    private readonly ankiConnect: AnkiConnectFactory
  ) {}

  async execute(
    owner: number,
    options: { ankiConnectHost?: string } = {}
  ): Promise<GetAnkifyActiveProfileResult> {
    const client = await this.clients.findActiveByOwner(owner);
    if (client == null) {
      throw new NoActiveAnkifyClientForProfileError();
    }

    const ac = this.ankiConnect(
      options.ankiConnectHost ?? 'localhost',
      client.anki_port,
      client.anki_connect_api_key
    );

    await ac.ping();
    const profile = await ac.getActiveProfile();
    return { profile };
  }
}
