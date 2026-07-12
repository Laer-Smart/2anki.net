import { AnkifyClientsRepositoryInterface } from '../../data_layer/ankify/AnkifyClientsRepository';
import { AnkiConnectFactory } from './GetAnkifyStatsUseCase';
import { buildDueCardsQuery, buildNewCardsQuery } from './reviewQueries';

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

    // Due + learning cards first (is:due already excludes suspended/buried),
    // then new cards capped at the deck's Anki daily new allotment. getDeckStats
    // returns the same new_count Anki shows in its deck list — net of new cards
    // already studied today and the deck's new/day option — so slicing to it
    // matches Anki's study session and never bypasses the daily limit.
    const [dueIds, newIds, deckStats] = await Promise.all([
      ac.findCards(buildDueCardsQuery(input.deck)),
      ac.findCards(buildNewCardsQuery(input.deck)),
      ac.getDeckStats([input.deck]),
    ]);

    const newLimit = Object.values(deckStats)[0]?.new_count ?? 0;
    const cardIds = [...dueIds, ...newIds.slice(0, Math.max(0, newLimit))];
    return { connected: true, cardIds };
  }
}
