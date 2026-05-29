import { Request, Response } from 'express';
import TransformController from './TransformController';
import { TransformApkgUseCase, UNKNOWN_MODEL_ERROR } from '../usecases/ankify/TransformApkgUseCase';

function makeRes(locals: Record<string, unknown> = {}): Partial<Response> {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    set: jest.fn().mockReturnThis(),
    contentType: jest.fn().mockReturnThis(),
    send: jest.fn(),
    attachment: jest.fn().mockReturnThis(),
    locals: { owner: 'user-1', ...locals },
  };
}

function makeReq(overrides: Partial<Request> = {}): Partial<Request> {
  return {
    body: { transform: 'add_hint' },
    files: [
      {
        originalname: 'deck.apkg',
        path: '',
        fieldname: 'file',
        encoding: '7bit',
        mimetype: 'application/octet-stream',
        size: 1024,
        destination: '/tmp',
        filename: 'deck.apkg',
        buffer: Buffer.from('apkg-bytes'),
        stream: null as never,
      },
    ],
    ...overrides,
  } as Partial<Request>;
}

function makeUseCase(stub: Partial<TransformApkgUseCase['execute']> = {}) {
  return {
    execute: jest.fn(stub as never),
  } as unknown as TransformApkgUseCase;
}

describe('TransformController', () => {
  it('returns 402 for a free user', async () => {
    const useCase = makeUseCase();
    const controller = new TransformController(useCase);
    const req = makeReq() as Request;
    const res = makeRes({ patreon: false, subscriber: false }) as Response;

    await controller.transform(req, res);

    expect(res.status).toHaveBeenCalledWith(402);
    expect(useCase.execute).not.toHaveBeenCalled();
  });

  it('returns 400 when no file is uploaded', async () => {
    const useCase = makeUseCase();
    const controller = new TransformController(useCase);
    const req = makeReq({ files: [] }) as Request;
    const res = makeRes({ subscriber: true }) as Response;

    await controller.transform(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when the uploaded file is not an apkg', async () => {
    const useCase = makeUseCase();
    const controller = new TransformController(useCase);
    const req = makeReq({
      files: [
        {
          originalname: 'notes.html',
          path: '',
          fieldname: 'file',
          encoding: '7bit',
          mimetype: 'text/html',
          size: 200,
          destination: '/tmp',
          filename: 'notes.html',
          buffer: Buffer.from('<html></html>'),
          stream: null as never,
        },
      ] as never,
    }) as Request;
    const res = makeRes({ subscriber: true }) as Response;

    await controller.transform(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when the transform name is missing or invalid', async () => {
    const useCase = makeUseCase();
    const controller = new TransformController(useCase);
    const req = makeReq({ body: { transform: 'bogus' } }) as Request;
    const res = makeRes({ subscriber: true }) as Response;

    await controller.transform(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(useCase.execute).not.toHaveBeenCalled();
  });

  it('requires a target language for translate_back', async () => {
    const useCase = makeUseCase();
    const controller = new TransformController(useCase);
    const req = makeReq({ body: { transform: 'translate_back' } }) as Request;
    const res = makeRes({ subscriber: true }) as Response;

    await controller.transform(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(useCase.execute).not.toHaveBeenCalled();
  });

  it('returns the apkg buffer with headers on success', async () => {
    const execute = jest.fn().mockResolvedValue({
      apkg: Buffer.from('transformed-apkg'),
      deckName: 'Pharmacology',
      noteCount: 42,
      failedCount: 0,
      usage: {
        inputTokens: 100,
        outputTokens: 20,
        estimatedCostUsd: 0.001,
        totalCalls: 42,
        elapsedMs: 1234,
      },
    });
    const useCase = { execute } as unknown as TransformApkgUseCase;
    const controller = new TransformController(useCase);
    const req = makeReq() as Request;
    const res = makeRes({ patreon: true }) as Response;

    await controller.transform(req, res);

    expect(execute).toHaveBeenCalledWith({
      bytes: expect.any(Buffer),
      transform: 'add_hint',
      targetLanguage: undefined,
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(expect.any(Buffer));
    expect(res.set).toHaveBeenCalledWith('Content-Type', 'application/apkg');
    expect(res.set).toHaveBeenCalledWith('X-Card-Count', '42');
  });

  it('maps the unknown-model error to a 400 with the spec message', async () => {
    const execute = jest.fn().mockRejectedValue(new Error(UNKNOWN_MODEL_ERROR));
    const useCase = { execute } as unknown as TransformApkgUseCase;
    const controller = new TransformController(useCase);
    const req = makeReq() as Request;
    const res = makeRes({ subscriber: true }) as Response;

    await controller.transform(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith(UNKNOWN_MODEL_ERROR);
  });
});
