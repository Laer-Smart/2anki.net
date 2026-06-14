import { AnkifyClientsRepositoryInterface } from '../../data_layer/ankify/AnkifyClientsRepository';
import { AnkiConnectFactory } from './GetAnkifyStatsUseCase';
import { buildCardExistsQuery } from './reviewQueries';

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

export class ReviewCardNotFoundError extends Error {
  constructor() {
    super('Card not found in the requesting user Anki');
    this.name = 'ReviewCardNotFoundError';
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

    const ac = this.ankiConnect(
      input.ankiConnectHost ?? 'localhost',
      client.anki_port,
      client.anki_connect_api_key
    );

    await ac.ping();

    const matches = await ac.findCards(buildCardExistsQuery(input.cardId));
    if (!matches.includes(input.cardId)) {
      throw new ReviewCardNotFoundError();
    }

    await ac.answerCards([{ cardId: input.cardId, ease: input.ease }]);
    return { graded: true };
  }
}
