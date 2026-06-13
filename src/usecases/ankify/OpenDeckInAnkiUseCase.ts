import { AnkifyClientsRepositoryInterface } from '../../data_layer/ankify/AnkifyClientsRepository';
import { AnkifyNotionSubscriptionsRepositoryInterface } from '../../data_layer/ankify/AnkifyNotionSubscriptionsRepository';
import { userOwnsDeck } from '../../lib/ankify/deckOwnership';
import { AnkiConnectFactory } from './GetAnkifyStatsUseCase';

export class DeckNotOwnedError extends Error {
  constructor() {
    super('Deck does not belong to the requesting user');
    this.name = 'DeckNotOwnedError';
  }
}

export interface OpenDeckInAnkiInput {
  owner: number;
  deck: string;
  ankiConnectHost?: string;
}

export interface OpenDeckInAnkiResult {
  opened: boolean;
}

export class OpenDeckInAnkiUseCase {
  constructor(
    private readonly clients: AnkifyClientsRepositoryInterface,
    private readonly subscriptions: AnkifyNotionSubscriptionsRepositoryInterface,
    private readonly ankiConnect: AnkiConnectFactory
  ) {}

  async execute(input: OpenDeckInAnkiInput): Promise<OpenDeckInAnkiResult> {
    const owned = await this.subscriptions.listByOwner(input.owner);
    if (!userOwnsDeck(input.deck, owned)) {
      throw new DeckNotOwnedError();
    }

    const client = await this.clients.findActiveByOwner(input.owner);
    if (client == null) {
      return { opened: false };
    }

    const ac = this.ankiConnect(
      input.ankiConnectHost ?? 'localhost',
      client.anki_port,
      client.anki_connect_api_key
    );

    await ac.ping();
    const opened = await ac.guiDeckOverview(input.deck);
    return { opened };
  }
}
