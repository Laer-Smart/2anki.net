import { Request, Response } from 'express';

import AnkifyController from './AnkifyController';
import { AnkiConnectUnreachableError } from '../services/ankify/AnkiConnectClient';
import { DeckNotOwnedError } from '../usecases/ankify/OpenDeckInAnkiUseCase';
import {
  InvalidReviewEaseError,
  NoActiveAnkifyClientForReviewError,
} from '../usecases/ankify/GradeReviewCardUseCase';

interface CapturingResponse {
  res: Response;
  statusCode: number;
  body: unknown;
}

const makeResponse = (): CapturingResponse => {
  const capture: CapturingResponse = {
    res: {} as Response,
    statusCode: 200,
    body: undefined,
  };
  const res = {
    locals: { owner: 42 },
    status: jest.fn((code: number) => {
      capture.statusCode = code;
      return res;
    }),
    json: jest.fn((payload: unknown) => {
      capture.body = payload;
      return res;
    }),
    send: jest.fn(() => res),
  } as unknown as Response;
  capture.res = res;
  return capture;
};

const QUEUE_INDEX = 32;
const GRADE_INDEX = 33;

const makeController = (index: number, useCase: { execute: jest.Mock }) => {
  const stubs = Array.from({ length: 34 }, () => ({}));
  stubs[index] = useCase;
  return new AnkifyController(
    ...(stubs as ConstructorParameters<typeof AnkifyController>)
  );
};

describe('AnkifyController review handlers', () => {
  test('getReviewQueue returns the snapshot for an owned deck', async () => {
    const result = {
      connected: true,
      cards: [
        {
          cardId: 9001,
          questionHtml: '<p>Q</p>',
          answerHtml: '<p>A</p>',
          css: '.card{}',
        },
      ],
    };
    const execute = jest.fn(async () => result);
    const controller = makeController(QUEUE_INDEX, { execute });
    const capture = makeResponse();

    await controller.getReviewQueue(
      { query: { deck: 'Notion Sync::Pharma' } } as unknown as Request,
      capture.res
    );

    expect(execute).toHaveBeenCalledWith({
      owner: 42,
      deck: 'Notion Sync::Pharma',
    });
    expect(capture.statusCode).toBe(200);
    expect(capture.body).toEqual(result);
  });

  test('getReviewQueue rejects a missing deck with 400', async () => {
    const execute = jest.fn();
    const controller = makeController(QUEUE_INDEX, { execute });
    const capture = makeResponse();

    await controller.getReviewQueue(
      { query: {} } as unknown as Request,
      capture.res
    );

    expect(execute).not.toHaveBeenCalled();
    expect(capture.statusCode).toBe(400);
  });

  test('getReviewQueue maps DeckNotOwnedError to 403', async () => {
    const execute = jest.fn(async () => {
      throw new DeckNotOwnedError();
    });
    const controller = makeController(QUEUE_INDEX, { execute });
    const capture = makeResponse();

    await controller.getReviewQueue(
      { query: { deck: 'Other::Deck' } } as unknown as Request,
      capture.res
    );

    expect(capture.statusCode).toBe(403);
  });

  test('gradeReviewCard grades and returns 200', async () => {
    const execute = jest.fn(async () => ({ graded: true }));
    const controller = makeController(GRADE_INDEX, { execute });
    const capture = makeResponse();

    await controller.gradeReviewCard(
      { body: { cardId: 9001, ease: 3 } } as unknown as Request,
      capture.res
    );

    expect(execute).toHaveBeenCalledWith({ owner: 42, cardId: 9001, ease: 3 });
    expect(capture.statusCode).toBe(200);
    expect(capture.body).toEqual({ graded: true });
  });

  test('gradeReviewCard rejects a missing cardId with 400', async () => {
    const execute = jest.fn();
    const controller = makeController(GRADE_INDEX, { execute });
    const capture = makeResponse();

    await controller.gradeReviewCard(
      { body: { ease: 3 } } as unknown as Request,
      capture.res
    );

    expect(execute).not.toHaveBeenCalled();
    expect(capture.statusCode).toBe(400);
  });

  test('gradeReviewCard maps InvalidReviewEaseError to 400', async () => {
    const execute = jest.fn(async () => {
      throw new InvalidReviewEaseError();
    });
    const controller = makeController(GRADE_INDEX, { execute });
    const capture = makeResponse();

    await controller.gradeReviewCard(
      { body: { cardId: 9001, ease: 9 } } as unknown as Request,
      capture.res
    );

    expect(capture.statusCode).toBe(400);
  });

  test('gradeReviewCard maps DeckNotOwnedError to 403', async () => {
    const execute = jest.fn(async () => {
      throw new DeckNotOwnedError();
    });
    const controller = makeController(GRADE_INDEX, { execute });
    const capture = makeResponse();

    await controller.gradeReviewCard(
      { body: { cardId: 9001, ease: 3 } } as unknown as Request,
      capture.res
    );

    expect(capture.statusCode).toBe(403);
  });

  test('gradeReviewCard maps an offline client to 503', async () => {
    const execute = jest.fn(async () => {
      throw new NoActiveAnkifyClientForReviewError();
    });
    const controller = makeController(GRADE_INDEX, { execute });
    const capture = makeResponse();

    await controller.gradeReviewCard(
      { body: { cardId: 9001, ease: 3 } } as unknown as Request,
      capture.res
    );

    expect(capture.statusCode).toBe(503);
  });

  test('gradeReviewCard maps AnkiConnectUnreachableError to 503', async () => {
    const execute = jest.fn(async () => {
      throw new AnkiConnectUnreachableError('http://x', new Error('down'));
    });
    const controller = makeController(GRADE_INDEX, { execute });
    const capture = makeResponse();

    await controller.gradeReviewCard(
      { body: { cardId: 9001, ease: 3 } } as unknown as Request,
      capture.res
    );

    expect(capture.statusCode).toBe(503);
  });
});
