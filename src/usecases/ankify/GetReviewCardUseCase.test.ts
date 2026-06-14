import { AnkifyClientsRepositoryInterface } from '../../data_layer/ankify/AnkifyClientsRepository';
import { AnkiConnectClient } from '../../services/ankify/AnkiConnectClient';
import { GetReviewCardUseCase } from './GetReviewCardUseCase';

const REVIEW_MEDIA_CSS_MARKER = '.n2a-review-missing{';

const activeClient = {
  id: 1,
  owner: 42,
  anki_port: 8765,
  anki_connect_api_key: 'k',
} as unknown as Awaited<
  ReturnType<AnkifyClientsRepositoryInterface['findActiveByOwner']>
>;

const clientsRepo = (
  client: Awaited<
    ReturnType<AnkifyClientsRepositoryInterface['findActiveByOwner']>
  >
): AnkifyClientsRepositoryInterface =>
  ({
    findActiveByOwner: jest.fn(async () => client),
  }) as unknown as AnkifyClientsRepositoryInterface;

describe('GetReviewCardUseCase', () => {
  it('returns connected:false when no active client', async () => {
    const useCase = new GetReviewCardUseCase(clientsRepo(null), jest.fn());

    const result = await useCase.execute({ owner: 42, cardId: 9001 });

    expect(result).toEqual({ connected: false, card: null });
  });

  it('returns card:null when the card id is not in this Anki', async () => {
    const findCards = jest.fn(async () => []);
    const cardsInfo = jest.fn();
    const factory = jest.fn(
      () =>
        ({
          ping: jest.fn(async () => 6),
          findCards,
          cardsInfo,
        }) as unknown as AnkiConnectClient
    );
    const useCase = new GetReviewCardUseCase(
      clientsRepo(activeClient),
      factory
    );

    const result = await useCase.execute({ owner: 42, cardId: 9001 });

    expect(findCards).toHaveBeenCalledWith('cid:9001');
    expect(result).toEqual({ connected: true, card: null });
    expect(cardsInfo).not.toHaveBeenCalled();
  });

  it('returns the card with the review media css appended', async () => {
    const findCards = jest.fn(async () => [9001]);
    const cardsInfo = jest.fn(async () => [
      {
        cardId: 9001,
        note: 5,
        deckName: 'Notion Sync::Pharma',
        lapses: 0,
        queue: 2,
        question: '<p>Q1</p>',
        answer: '<p>A1</p>',
        css: '.card { color: black; }',
      },
    ]);
    const factory = jest.fn(
      () =>
        ({
          ping: jest.fn(async () => 6),
          findCards,
          cardsInfo,
        }) as unknown as AnkiConnectClient
    );
    const useCase = new GetReviewCardUseCase(
      clientsRepo(activeClient),
      factory
    );

    const result = await useCase.execute({ owner: 42, cardId: 9001 });

    expect(result.connected).toBe(true);
    expect(result.card).toMatchObject({
      cardId: 9001,
      questionHtml: '<p>Q1</p>',
      answerHtml: '<p>A1</p>',
    });
    expect(result.card?.css).toContain('.card { color: black; }');
    expect(result.card?.css).toContain(REVIEW_MEDIA_CSS_MARKER);
  });

  it('inlines image and audio media as data URIs and strips raw tokens', async () => {
    const findCards = jest.fn(async () => [9001]);
    const cardsInfo = jest.fn(async () => [
      {
        cardId: 9001,
        note: 5,
        deckName: 'Notion Sync::JP',
        lapses: 0,
        queue: 2,
        question: '<img src="a.jpg">[anki:play:q:0]',
        answer: '[sound:b.mp3][anki:play:a:0]',
        css: '.card {}',
      },
    ]);
    const retrieveMediaFile = jest.fn(async () =>
      Buffer.from('BYTES', 'utf-8').toString('base64')
    );
    const factory = jest.fn(
      () =>
        ({
          ping: jest.fn(async () => 6),
          findCards,
          cardsInfo,
          retrieveMediaFile,
        }) as unknown as AnkiConnectClient
    );
    const useCase = new GetReviewCardUseCase(
      clientsRepo(activeClient),
      factory
    );

    const result = await useCase.execute({ owner: 42, cardId: 9001 });

    expect(result.card?.questionHtml).toContain('data:image/jpeg;base64,');
    expect(result.card?.answerHtml).toContain('<audio');
    expect(result.card?.answerHtml).toContain('data:audio/mpeg;base64,');
    expect(result.card?.questionHtml).not.toContain('[anki:play:');
    expect(result.card?.answerHtml).not.toContain('[sound:');
  });

  it('fetches a media file shared across front and back only once', async () => {
    const findCards = jest.fn(async () => [9001]);
    const cardsInfo = jest.fn(async () => [
      {
        cardId: 9001,
        note: 5,
        deckName: 'Notion Sync::JP',
        lapses: 0,
        queue: 2,
        question: '<img src="shared.png">',
        answer: '<img src="shared.png">',
        css: '',
      },
    ]);
    const retrieveMediaFile = jest.fn(async () =>
      Buffer.from('BYTES', 'utf-8').toString('base64')
    );
    const factory = jest.fn(
      () =>
        ({
          ping: jest.fn(async () => 6),
          findCards,
          cardsInfo,
          retrieveMediaFile,
        }) as unknown as AnkiConnectClient
    );
    const useCase = new GetReviewCardUseCase(
      clientsRepo(activeClient),
      factory
    );

    await useCase.execute({ owner: 42, cardId: 9001 });

    expect(retrieveMediaFile).toHaveBeenCalledTimes(1);
  });
});
