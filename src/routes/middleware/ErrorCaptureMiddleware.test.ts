import { Request, Response, NextFunction } from 'express';
import { makeErrorCaptureMiddleware } from './ErrorCaptureMiddleware';
import {
  IErrorEventRepository,
  ErrorEventInsert,
} from '../../data_layer/ErrorEventRepository';
import { FallbackErrorPayload } from '../../lib/errorFallback';

function makeRepository(
  existsResult = false
): IErrorEventRepository & { inserts: ErrorEventInsert[] } {
  const inserts: ErrorEventInsert[] = [];
  return {
    inserts,
    async insert(row: ErrorEventInsert) {
      inserts.push(row);
    },
    async existsWithinWindow() {
      return existsResult;
    },
    async listGroups() {
      return [];
    },
    async countGroups() {
      return 0;
    },
    async latestSamples() {
      return [];
    },
    async resolveGroup() {},
    async reopenGroup() {},
  };
}

function makeReq(url = '/api/upload', remoteAddress = '127.0.0.1'): Request {
  return {
    originalUrl: url,
    headers: {},
    socket: { remoteAddress },
  } as unknown as Request;
}

function makeRes(owner?: number): Response {
  return { locals: { owner } } as unknown as Response;
}

function makeNext(): NextFunction & { receivedErr?: unknown } {
  const fn = jest.fn() as jest.Mock & { receivedErr?: unknown };
  fn.mockImplementation((err?: unknown) => {
    fn.receivedErr = err;
  });
  return fn as unknown as NextFunction & { receivedErr?: unknown };
}

const testError = new Error('Database connection failed');

describe('makeErrorCaptureMiddleware', () => {
  it('calls next(err) so ErrorHandler still runs', async () => {
    const repo = makeRepository();
    const middleware = makeErrorCaptureMiddleware(repo);
    const next = makeNext();

    await middleware(testError, makeReq(), makeRes(), next);

    expect(next).toHaveBeenCalledWith(testError);
  });

  it('inserts a server error row into the repository', async () => {
    const repo = makeRepository();
    const middleware = makeErrorCaptureMiddleware(repo);
    const next = makeNext();

    await middleware(testError, makeReq('/api/upload'), makeRes(), next);

    expect(repo.inserts).toHaveLength(1);
    expect(repo.inserts[0].source).toBe('server');
    expect(repo.inserts[0].message).toBe(testError.message);
    expect(repo.inserts[0].url).toBe('/api/upload');
  });

  it('does not persist the raw IP address', async () => {
    const repo = makeRepository();
    const middleware = makeErrorCaptureMiddleware(repo);
    const next = makeNext();

    await middleware(
      testError,
      makeReq('/api/upload', '10.0.0.1'),
      makeRes(),
      next
    );

    expect(repo.inserts[0].ip_hash).not.toBe('10.0.0.1');
    expect(repo.inserts[0].ip_hash).toHaveLength(64);
  });

  it('skips the insert when a duplicate exists within the window', async () => {
    const repo = makeRepository(true);
    const middleware = makeErrorCaptureMiddleware(repo);
    const next = makeNext();

    await middleware(testError, makeReq(), makeRes(), next);

    expect(repo.inserts).toHaveLength(0);
    expect(next).toHaveBeenCalledWith(testError);
  });

  it('captures user_id from res.locals.owner when present', async () => {
    const repo = makeRepository();
    const middleware = makeErrorCaptureMiddleware(repo);
    const next = makeNext();

    await middleware(testError, makeReq(), makeRes(42), next);

    expect(repo.inserts[0].user_id).toBe(42);
  });

  it('sets user_id to null when owner is absent', async () => {
    const repo = makeRepository();
    const middleware = makeErrorCaptureMiddleware(repo);
    const next = makeNext();

    await middleware(testError, makeReq(), makeRes(undefined), next);

    expect(repo.inserts[0].user_id).toBeNull();
  });

  it('stamps the release on inserted rows when provided', async () => {
    const repo = makeRepository();
    const middleware = makeErrorCaptureMiddleware(repo, undefined, 'abc1234');
    const next = makeNext();

    await middleware(testError, makeReq(), makeRes(), next);

    expect(repo.inserts[0].release).toBe('abc1234');
  });

  it('sets release to null when no release is provided', async () => {
    const repo = makeRepository();
    const middleware = makeErrorCaptureMiddleware(repo);
    const next = makeNext();

    await middleware(testError, makeReq(), makeRes(), next);

    expect(repo.inserts[0].release).toBeNull();
  });

  it('calls next(err) even when the repository throws', async () => {
    const brokenRepo: IErrorEventRepository = {
      async insert() {
        throw new Error('DB down');
      },
      async existsWithinWindow() {
        throw new Error('DB down');
      },
      async listGroups() {
        return [];
      },
      async countGroups() {
        return 0;
      },
      async latestSamples() {
        return [];
      },
      async resolveGroup() {},
      async reopenGroup() {},
    };
    const middleware = makeErrorCaptureMiddleware(brokenRepo);
    const next = makeNext();

    await expect(
      middleware(testError, makeReq(), makeRes(), next)
    ).resolves.not.toThrow();

    expect(next).toHaveBeenCalledWith(testError);
  });

  it('calls writeFallback with db-outage phase when the repository insert fails', async () => {
    const brokenRepo: IErrorEventRepository = {
      async insert() {
        throw new Error('DB down');
      },
      async existsWithinWindow() {
        throw new Error('DB down');
      },
      async listGroups() {
        return [];
      },
      async countGroups() {
        return 0;
      },
      async latestSamples() {
        return [];
      },
      async resolveGroup() {},
      async reopenGroup() {},
    };
    const captured: FallbackErrorPayload[] = [];
    const writeFallback = (payload: FallbackErrorPayload) => {
      captured.push(payload);
    };
    const middleware = makeErrorCaptureMiddleware(brokenRepo, writeFallback);
    const next = makeNext();

    await middleware(testError, makeReq(), makeRes(), next);

    expect(captured).toHaveLength(1);
    expect(captured[0].phase).toBe('db-outage');
    expect(captured[0].source).toBe('server');
    expect(captured[0].message).toBe(testError.message);
    expect(next).toHaveBeenCalledWith(testError);
  });
});
