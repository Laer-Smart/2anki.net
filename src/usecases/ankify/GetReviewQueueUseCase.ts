import { AnkifyClientsRepositoryInterface } from '../../data_layer/ankify/AnkifyClientsRepository';
import { AnkiConnectFactory } from './GetAnkifyStatsUseCase';
import { inlineReviewMedia } from './inlineReviewMedia';
import { buildDueCardsQuery } from './reviewQueries';

const REVIEW_MEDIA_CSS =
  'img{max-width:100%!important;height:auto!important;max-height:60vh!important;object-fit:contain;display:block;margin-inline:auto}' +
  'audio{display:block;width:100%;max-width:320px;margin-inline:auto}' +
  'body.card{overflow-x:hidden}' +
  '.n2a-review-missing{display:inline-block;font-size:.75rem;color:#6b7280;background:#f1f1ef;border-radius:.25rem;padding:.125rem .375rem}';

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
    private readonly ankiConnect: AnkiConnectFactory
  ) {}

  async execute(input: GetReviewQueueInput): Promise<GetReviewQueueResult> {
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
    const cache = new Map<string, string | null>();
    const fetchMedia = (filename: string) => ac.retrieveMediaFile(filename);

    const cards = await Promise.all(
      info.map(async (card) => ({
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
      }))
    );

    return { connected: true, cards };
  }
}
