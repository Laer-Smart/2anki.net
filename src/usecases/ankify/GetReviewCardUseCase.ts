import { AnkifyClientsRepositoryInterface } from '../../data_layer/ankify/AnkifyClientsRepository';
import { AnkiConnectFactory } from './GetAnkifyStatsUseCase';
import { inlineReviewMedia } from './inlineReviewMedia';
import { REVIEW_MEDIA_CSS } from './reviewMediaCss';
import { buildCardExistsQuery } from './reviewQueries';

export interface ReviewCard {
  cardId: number;
  questionHtml: string;
  answerHtml: string;
  css: string;
}

export type GetReviewCardResult =
  | { connected: true; card: ReviewCard | null }
  | { connected: false; card: null };

export interface GetReviewCardInput {
  owner: number;
  cardId: number;
  ankiConnectHost?: string;
}

export class GetReviewCardUseCase {
  constructor(
    private readonly clients: AnkifyClientsRepositoryInterface,
    private readonly ankiConnect: AnkiConnectFactory
  ) {}

  async execute(input: GetReviewCardInput): Promise<GetReviewCardResult> {
    const client = await this.clients.findActiveByOwner(input.owner);
    if (client == null) {
      return { connected: false, card: null };
    }

    const ac = this.ankiConnect(
      input.ankiConnectHost ?? 'localhost',
      client.anki_port,
      client.anki_connect_api_key
    );

    await ac.ping();

    const matches = await ac.findCards(buildCardExistsQuery(input.cardId));
    if (!matches.includes(input.cardId)) {
      return { connected: true, card: null };
    }

    const info = await ac.cardsInfo([input.cardId]);
    const card = info[0];
    if (card == null) {
      return { connected: true, card: null };
    }

    const cache = new Map<string, string | null>();
    const fetchMedia = (filename: string) => ac.retrieveMediaFile(filename);

    return {
      connected: true,
      card: {
        cardId: card.cardId,
        questionHtml: await inlineReviewMedia(
          card.question ?? '',
          fetchMedia,
          cache
        ),
        answerHtml: await inlineReviewMedia(
          card.answer ?? '',
          fetchMedia,
          cache
        ),
        css: (card.css ?? '') + REVIEW_MEDIA_CSS,
      },
    };
  }
}
