import { Request, Response } from 'express';
import {
  ErrorEventController,
  InMemoryRateLimiter,
  RateLimiter,
} from './ErrorEventController';
import { IngestErrorEventUseCase } from '../usecases/events/IngestErrorEventUseCase';

function makeIngestUseCase(result: 'accepted' | 'duplicate' = 'accepted'): IngestErrorEventUseCase {
  return {
    execute: jest.fn(async () => result),
  } as unknown as IngestErrorEventUseCase;
}

function makeRes(): jest.Mocked<Pick<Response, 'status' | 'json' | 'end'>> & { _statusCode?: number; _body?: unknown } {
  const res = {
    _statusCode: 0,
    _body: undefined as unknown,
    status(code: number) {
      this._statusCode = code;
      return this;
    },
    json(body: unknown) {
      this._body = body;
      return this;
    },
    end() {
      return this;
    },
  };
  return res as unknown as jest.Mocked<Pick<Response, 'status' | 'json' | 'end'>> & { _statusCode?: number; _body?: unknown };
}

function makeReq(body: unknown, remoteAddress = '127.0.0.1'): Request {
  return {
    body,
    headers: {},
    socket: { remoteAddress },
  } as unknown as Request;
}

const VALID_BODY = {
  message: 'TypeError: x is null',
  stack: 'at foo.ts:5',
  url: 'https://2anki.net',
  userAgent: 'Mozilla/5.0',
  release: 'abc12345',
};

describe('ErrorEventController.ingest', () => {
  it('returns 202 on a valid payload', async () => {
    const controller = new ErrorEventController(makeIngestUseCase());
    const res = makeRes();
    await controller.ingest(makeReq(VALID_BODY), res as unknown as Response);
    expect(res._statusCode).toBe(202);
  });

  it('returns 400 on missing message', async () => {
    const controller = new ErrorEventController(makeIngestUseCase());
    const res = makeRes();
    await controller.ingest(makeReq({ stack: 'foo' }), res as unknown as Response);
    expect(res._statusCode).toBe(400);
  });

  it('returns 400 on null body', async () => {
    const controller = new ErrorEventController(makeIngestUseCase());
    const res = makeRes();
    await controller.ingest(makeReq(null), res as unknown as Response);
    expect(res._statusCode).toBe(400);
  });

  it('returns 413 on oversized payload', async () => {
    const controller = new ErrorEventController(makeIngestUseCase());
    const res = makeRes();
    await controller.ingest(makeReq({ message: 'x'.repeat(11_000) }), res as unknown as Response);
    expect(res._statusCode).toBe(413);
  });

  it('returns 429 when rate limiter denies the request', async () => {
    const exhaustedLimiter: RateLimiter = { check: () => false };
    const controller = new ErrorEventController(makeIngestUseCase(), exhaustedLimiter);
    const res = makeRes();
    await controller.ingest(makeReq(VALID_BODY), res as unknown as Response);
    expect(res._statusCode).toBe(429);
  });

  it('does not call the use case when the rate limit is exceeded', async () => {
    const useCase = makeIngestUseCase();
    const exhaustedLimiter: RateLimiter = { check: () => false };
    const controller = new ErrorEventController(useCase, exhaustedLimiter);
    const res = makeRes();
    await controller.ingest(makeReq(VALID_BODY), res as unknown as Response);
    expect(useCase.execute).not.toHaveBeenCalled();
  });

  it('does not expose the raw IP in the response', async () => {
    const useCase = makeIngestUseCase();
    const executeSpy = jest.spyOn(useCase, 'execute');
    const controller = new ErrorEventController(useCase);
    const res = makeRes();
    await controller.ingest(makeReq(VALID_BODY, '192.168.1.1'), res as unknown as Response);
    const callArg = (executeSpy.mock.calls[0][0] as { ipHash: string; payload: unknown });
    expect(callArg.ipHash).not.toBe('192.168.1.1');
    expect(callArg.ipHash).toHaveLength(64);
  });
});

describe('InMemoryRateLimiter', () => {
  it.each([
    [1, true],
    [5, true],
    [10, true],
    [11, false],
  ])('after %i requests from the same IP the %ith is %s', (count, expected) => {
    const limiter = new InMemoryRateLimiter(60_000, 10, 1000);
    let result = false;
    for (let i = 0; i < count; i++) {
      result = limiter.check('same-ip-hash');
    }
    expect(result).toBe(expected);
  });

  it('allows a second IP while the first is exhausted', () => {
    const limiter = new InMemoryRateLimiter(60_000, 1, 1000);
    limiter.check('ip-a');
    limiter.check('ip-a');
    const result = limiter.check('ip-b');
    expect(result).toBe(true);
  });
});
