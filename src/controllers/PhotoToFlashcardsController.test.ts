import type express from 'express';

import { PhotoToFlashcardsController } from './PhotoToFlashcardsController';
import type { PhotoToFlashcardsUseCase } from '../usecases/imageOcclusion/PhotoToFlashcardsUseCase';

jest.mock('node:fs', () => {
  const actual = jest.requireActual('node:fs');
  return {
    ...actual,
    createReadStream: jest.fn(),
    unlink: jest.fn((_p, cb) => cb?.()),
  };
});

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

describe('PhotoToFlashcardsController mode forwarding', () => {
  const baseBody = {
    imageBase64: 'abc',
    mediaType: 'image/jpeg',
    deckName: 'X',
    width: 100,
    height: 100,
  };

  it.each(['generative', 'verbatim'] as const)(
    'forwards a valid mode (%s) to the use case',
    async (mode) => {
      const useCase = makeUseCase();
      const controller = new PhotoToFlashcardsController(useCase);
      await controller.create(makeReq({ ...baseBody, mode }), makeRes());
      expect(useCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ mode })
      );
    }
  );

  it('defaults to generative when mode is missing', async () => {
    const useCase = makeUseCase();
    const controller = new PhotoToFlashcardsController(useCase);
    await controller.create(makeReq(baseBody), makeRes());
    expect(useCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'generative' })
    );
  });

  it('defaults to generative when mode is an unknown string', async () => {
    const useCase = makeUseCase();
    const controller = new PhotoToFlashcardsController(useCase);
    await controller.create(makeReq({ ...baseBody, mode: 'hallucinate' }), makeRes());
    expect(useCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'generative' })
    );
  });
});

describe('PhotoToFlashcardsController MCQ headers', () => {
  const baseBody = {
    imageBase64: 'abc',
    mediaType: 'image/jpeg',
    deckName: 'X',
    width: 100,
    height: 100,
  };

  function makeStreamMock() {
    const handlers: Record<string, () => void> = {};
    return {
      on: jest.fn((event: string, cb: () => void) => {
        handlers[event] = cb;
        return this;
      }),
      pipe: jest.fn(),
      handlers,
    };
  }

  it('writes X-MCQ-Count and X-MCQ-Skipped-Count headers from the use case result', async () => {
    const fs = jest.requireMock('node:fs') as { createReadStream: jest.Mock };
    fs.createReadStream.mockReturnValue(makeStreamMock());

    const useCase = {
      execute: jest.fn().mockResolvedValue({
        apkgPath: '/tmp/out.apkg',
        cardCount: 5,
        estimatedCostUsd: 0.001,
        tileCount: 1,
        mcqCount: 3,
        mcqSkippedCount: 1,
      }),
    } as unknown as PhotoToFlashcardsUseCase;
    const controller = new PhotoToFlashcardsController(useCase);
    const res = makeRes();

    await controller.create(makeReq(baseBody), res);

    expect(res.setHeader).toHaveBeenCalledWith('X-MCQ-Count', '3');
    expect(res.setHeader).toHaveBeenCalledWith('X-MCQ-Skipped-Count', '1');
    expect(res.setHeader).toHaveBeenCalledWith('X-Card-Count', '5');
  });
});
