import { AnkifyClientsRepositoryInterface } from '../../data_layer/ankify/AnkifyClientsRepository';
import { AnkifyNotionSubscriptionsRepositoryInterface } from '../../data_layer/ankify/AnkifyNotionSubscriptionsRepository';
import { userOwnsDeck } from '../../lib/ankify/deckOwnership';
import { AnkiConnectFactory } from './GetAnkifyStatsUseCase';
import { DeckNotOwnedError } from './OpenDeckInAnkiUseCase';
import { buildDueCardsQuery } from './reviewQueries';

export interface ReviewQueueCard {
  cardId: number;
  questionHtml: string;
  answerHtml: string;
  css: string;
}

export interface GetReviewQueueResult {
  connected: boolean;
  cards: ReviewQueueCard[];
}

export interface GetReviewQueueInput {
  owner: number;
  deck: string;
  ankiConnectHost?: string;
}

export class GetReviewQueueUseCase {
  constructor(
    private readonly clients: AnkifyClientsRepositoryInterface,
    private readonly subscriptions: AnkifyNotionSubscriptionsRepositoryInterface,
    private readonly ankiConnect: AnkiConnectFactory
  ) {}

  async execute(input: GetReviewQueueInput): Promise<GetReviewQueueResult> {
    const owned = await this.subscriptions.listByOwner(input.owner);
    if (!userOwnsDeck(input.deck, owned)) {
      throw new DeckNotOwnedError();
    }

    const client = await this.clients.findActiveByOwner(input.owner);
    if (client == null) {
      return { connected: false, cards: [] };
    }

    const ac = this.ankiConnect(
      input.ankiConnectHost ?? 'localhost',
      client.anki_port,
      client.anki_connect_api_key
    );

    await ac.ping();

    const cardIds = await ac.findCards(buildDueCardsQuery(input.deck));
    if (cardIds.length === 0) {
      return { connected: true, cards: [] };
    }

    const info = await ac.cardsInfo(cardIds);
    const cards = info.map((card) => ({
      cardId: card.cardId,
      questionHtml: card.question ?? '',
      answerHtml: card.answer ?? '',
      css: card.css ?? '',
    }));

    return { connected: true, cards };
  }
}
