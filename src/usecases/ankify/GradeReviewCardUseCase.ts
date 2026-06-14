import { AnkifyClientsRepositoryInterface } from '../../data_layer/ankify/AnkifyClientsRepository';
import { AnkifyNotionSubscriptionsRepositoryInterface } from '../../data_layer/ankify/AnkifyNotionSubscriptionsRepository';
import { ownedDeckNames } from '../../lib/ankify/deckOwnership';
import { AnkiConnectFactory } from './GetAnkifyStatsUseCase';
import { DeckNotOwnedError } from './OpenDeckInAnkiUseCase';
import { buildCardOwnershipQuery } from './reviewQueries';

export class InvalidReviewEaseError extends Error {
  constructor() {
    super('ease must be an integer between 1 and 4');
    this.name = 'InvalidReviewEaseError';
  }
}

export class NoActiveAnkifyClientForReviewError extends Error {
  constructor() {
    super('No active Ankify client');
    this.name = 'NoActiveAnkifyClientForReviewError';
  }
}

export interface GradeReviewCardInput {
  owner: number;
  cardId: number;
  ease: number;
  ankiConnectHost?: string;
}

export interface GradeReviewCardResult {
  graded: true;
}

const isValidEase = (ease: number): boolean =>
  Number.isInteger(ease) && ease >= 1 && ease <= 4;

export class GradeReviewCardUseCase {
  constructor(
    private readonly clients: AnkifyClientsRepositoryInterface,
    private readonly subscriptions: AnkifyNotionSubscriptionsRepositoryInterface,
    private readonly ankiConnect: AnkiConnectFactory
  ) {}

  async execute(input: GradeReviewCardInput): Promise<GradeReviewCardResult> {
    if (!isValidEase(input.ease)) {
      throw new InvalidReviewEaseError();
    }

    const client = await this.clients.findActiveByOwner(input.owner);
    if (client == null) {
      throw new NoActiveAnkifyClientForReviewError();
    }

    const owned = await this.subscriptions.listByOwner(input.owner);
    const query = buildCardOwnershipQuery(input.cardId, ownedDeckNames(owned));
    if (query == null) {
      throw new DeckNotOwnedError();
    }

    const ac = this.ankiConnect(
      input.ankiConnectHost ?? 'localhost',
      client.anki_port,
      client.anki_connect_api_key
    );

    await ac.ping();

    const matches = await ac.findCards(query);
    if (!matches.includes(input.cardId)) {
      throw new DeckNotOwnedError();
    }

    await ac.answerCards([{ cardId: input.cardId, ease: input.ease }]);
    return { graded: true };
  }
}
