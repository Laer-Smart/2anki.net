import type express from 'express';
import { AutoSuggestOcclusionsController } from './AutoSuggestOcclusionsController';
import type { AutoSuggestOcclusionsUseCase } from '../usecases/imageOcclusion/AutoSuggestOcclusionsUseCase';

function makeRes(locals: Record<string, unknown> = {}): express.Response {
  const res = {
    locals: { owner: '42', ...locals },
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res as unknown as express.Response;
}

function makeReq(body: Record<string, unknown>): express.Request {
  return { body } as express.Request;
}

function makeUseCase(result: unknown = { rects: [], inputTokens: 100, outputTokens: 20, fromCache: false }) {
  return {
    execute: jest.fn().mockResolvedValue(result),
  } as unknown as jest.Mocked<AutoSuggestOcclusionsUseCase>;
}

const VALID_BODY = {
  imageBase64: 'abc123',
  mediaType: 'image/jpeg',
  width: 1080,
  height: 720,
};

describe('AutoSuggestOcclusionsController', () => {
  it('returns 400 when imageBase64 is missing', async () => {
    const useCase = makeUseCase();
    const controller = new AutoSuggestOcclusionsController(useCase);
    const res = makeRes();
    await controller.suggest(makeReq({ mediaType: 'image/jpeg', width: 100, height: 100 }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 for an unsupported media type', async () => {
    const useCase = makeUseCase();
    const controller = new AutoSuggestOcclusionsController(useCase);
    const res = makeRes();
    await controller.suggest(makeReq({ ...VALID_BODY, mediaType: 'image/bmp' }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 200 with rects array on success', async () => {
    const rects = [
      { id: 'r1', x: 0.1, y: 0.1, w: 0.2, h: 0.05, label: 'Mitosis', shape: 'rect', confidence: 0.9, source: 'auto' },
    ];
    const useCase = makeUseCase({ rects, inputTokens: 100, outputTokens: 20, fromCache: false });
    const controller = new AutoSuggestOcclusionsController(useCase);
    const res = makeRes();

    await controller.suggest(makeReq(VALID_BODY), res);

    expect(res.json).toHaveBeenCalledWith({ rects });
  });

  it('returns 429 when use case throws a quota-reached error', async () => {
    const err = Object.assign(new Error('quota reached'), { status: 429 });
    const useCase = {
      execute: jest.fn().mockRejectedValue(err),
    } as unknown as jest.Mocked<AutoSuggestOcclusionsUseCase>;
    const controller = new AutoSuggestOcclusionsController(useCase);
    const res = makeRes();

    await controller.suggest(makeReq(VALID_BODY), res);

    expect(res.status).toHaveBeenCalledWith(429);
  });

  it('returns 413 when use case throws a 413 error', async () => {
    const err = Object.assign(new Error('too large'), { status: 413 });
    const useCase = {
      execute: jest.fn().mockRejectedValue(err),
    } as unknown as jest.Mocked<AutoSuggestOcclusionsUseCase>;
    const controller = new AutoSuggestOcclusionsController(useCase);
    const res = makeRes();

    await controller.suggest(makeReq(VALID_BODY), res);

    expect(res.status).toHaveBeenCalledWith(413);
  });

  it('rethrows unexpected errors', async () => {
    const err = new Error('unexpected db failure');
    const useCase = {
      execute: jest.fn().mockRejectedValue(err),
    } as unknown as jest.Mocked<AutoSuggestOcclusionsUseCase>;
    const controller = new AutoSuggestOcclusionsController(useCase);
    const res = makeRes();

    await expect(controller.suggest(makeReq(VALID_BODY), res)).rejects.toThrow('unexpected db failure');
  });
});
