import { AnkifyClientsRepositoryInterface } from '../../data_layer/ankify/AnkifyClientsRepository';
import { AnkiConnectFactory } from './GetAnkifyStatsUseCase';
import { buildDueCardsQuery } from './reviewQueries';

export type GetReviewQueueResult =
  | { connected: true; cardIds: number[] }
  | { connected: false };

export interface GetReviewQueueInput {
  owner: number;
  deck: string;
  ankiConnectHost?: string;
}

export class GetReviewQueueUseCase {
  constructor(
    private readonly clients: AnkifyClientsRepositoryInterface,
    private readonly ankiConnect: AnkiConnectFactory
  ) {}

  async execute(input: GetReviewQueueInput): Promise<GetReviewQueueResult> {
    const client = await this.clients.findActiveByOwner(input.owner);
    if (client == null) {
      return { connected: false };
    }

    const ac = this.ankiConnect(
      input.ankiConnectHost ?? 'localhost',
      client.anki_port,
      client.anki_connect_api_key
    );

    await ac.ping();

    const cardIds = await ac.findCards(buildDueCardsQuery(input.deck));
    return { connected: true, cardIds };
  }
}
