import type express from 'express';

import { PhotoToFlashcardsController } from './PhotoToFlashcardsController';
import type { PhotoToFlashcardsUseCase } from '../usecases/imageOcclusion/PhotoToFlashcardsUseCase';

function makeRes(): express.Response {
  const res = {
    locals: { owner: '42' },
    setHeader: jest.fn(),
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res as unknown as express.Response;
}

function makeReq(body: Record<string, unknown>): express.Request {
  return { body } as express.Request;
}

function makeUseCase() {
  const execute = jest.fn().mockRejectedValue(
    Object.assign(new Error('boom'), { status: 413 })
  );
  return { execute } as unknown as jest.Mocked<PhotoToFlashcardsUseCase> & {
    execute: jest.Mock;
  };
}

describe('PhotoToFlashcardsController density forwarding', () => {
  const baseBody = {
    imageBase64: 'abc',
    mediaType: 'image/jpeg',
    deckName: 'X',
    width: 100,
    height: 100,
  };

  it.each(['sparse', 'balanced', 'dense'] as const)(
    'forwards a valid density (%s) to the use case',
    async (density) => {
      const useCase = makeUseCase();
      const controller = new PhotoToFlashcardsController(useCase);
      await controller.create(makeReq({ ...baseBody, density }), makeRes());
      expect(useCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ density })
      );
    }
  );

  it('defaults to balanced when density is missing', async () => {
    const useCase = makeUseCase();
    const controller = new PhotoToFlashcardsController(useCase);
    await controller.create(makeReq(baseBody), makeRes());
    expect(useCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ density: 'balanced' })
    );
  });

  it('defaults to balanced when density is an unknown string', async () => {
    const useCase = makeUseCase();
    const controller = new PhotoToFlashcardsController(useCase);
    await controller.create(makeReq({ ...baseBody, density: 'extra-dense' }), makeRes());
    expect(useCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ density: 'balanced' })
    );
  });
});
