jest.mock('./conversionPool', () => ({
  __esModule: true,
  shutdownConversionPool: jest.fn(),
  POOL_CLOSE_TIMEOUT_MS:
    jest.requireActual('./conversionPool').POOL_CLOSE_TIMEOUT_MS,
}));

import type http from 'http';
import type { Knex } from 'knex';
import { shutdownConversionPool } from './conversionPool';
import {
  gracefulShutdown,
  POOL_DRAIN_TIMEOUT_MS,
  SHUTDOWN_TIMEOUT_MS,
  PM2_KILL_TIMEOUT_MS,
  resetGracefulShutdownStateForTesting,
} from './gracefulShutdown';

function fakeServer(): {
  server: http.Server;
  calls: { close: number; idle: number };
} {
  const calls = { close: 0, idle: 0 };
  const server = {
    close: (cb?: () => void) => {
      calls.close += 1;
      if (cb) cb();
      return server;
    },
    closeIdleConnections: () => {
      calls.idle += 1;
    },
  } as unknown as http.Server;
  return { server, calls };
}

function fakeDatabase(overrides: { destroy?: () => Promise<void> } = {}): {
  db: Knex;
  destroyCalls: { count: number };
} {
  const destroyCalls = { count: 0 };
  const db = {
    destroy:
      overrides.destroy ??
      (() => {
        destroyCalls.count += 1;
        return Promise.resolve();
      }),
  } as unknown as Knex;
  return { db, destroyCalls };
}

describe('gracefulShutdown', () => {
  let exitSpy: jest.SpyInstance;
  let infoSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  const drainMock = shutdownConversionPool as jest.Mock;

  beforeEach(() => {
    drainMock.mockReset();
    drainMock.mockResolvedValue(undefined);
    resetGracefulShutdownStateForTesting();
    exitSpy = jest
      .spyOn(process, 'exit')
      .mockImplementation(() => undefined as never);
    infoSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined);
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    exitSpy.mockRestore();
    infoSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('drains HTTP, conversion pool, and DB pool, then exits 0', async () => {
    const { server, calls } = fakeServer();
    const { db, destroyCalls } = fakeDatabase();

    await gracefulShutdown('SIGTERM', server, db);

    expect(calls.idle).toBe(1);
    expect(calls.close).toBe(1);
    expect(drainMock).toHaveBeenCalledWith({
      timeoutMs: POOL_DRAIN_TIMEOUT_MS,
    });
    expect(destroyCalls.count).toBe(1);
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it('still exits 0 if the conversion pool drain throws', async () => {
    drainMock.mockRejectedValue(new Error('drain failed'));
    const { server } = fakeServer();
    const { db } = fakeDatabase();

    await gracefulShutdown('SIGINT', server, db);

    expect(exitSpy).toHaveBeenCalledWith(0);
    expect(errorSpy).toHaveBeenCalledWith(
      'Conversion pool drain failed:',
      expect.any(Error)
    );
  });

  it('still exits 0 if database.destroy throws', async () => {
    const { server } = fakeServer();
    const { db } = fakeDatabase({
      destroy: () => Promise.reject(new Error('pool teardown failed')),
    });

    await gracefulShutdown('SIGINT', server, db);

    expect(exitSpy).toHaveBeenCalledWith(0);
    expect(errorSpy).toHaveBeenCalledWith(
      'Database pool teardown failed:',
      expect.any(Error)
    );
  });

  it('is idempotent — a second signal during drain is a no-op', async () => {
    let release: (() => void) | null = null;
    drainMock.mockReturnValue(
      new Promise<void>((resolve) => {
        release = resolve;
      })
    );
    const { server } = fakeServer();
    const { db } = fakeDatabase();

    const first = gracefulShutdown('SIGTERM', server, db);
    const second = gracefulShutdown('SIGINT', server, db);

    release!();
    await Promise.all([first, second]);

    expect(exitSpy).toHaveBeenCalledTimes(1);
    expect(drainMock).toHaveBeenCalledTimes(1);
  });

  it('orders the timeouts so drain finishes before the hard exit and pm2 SIGKILL', () => {
    expect(POOL_DRAIN_TIMEOUT_MS).toBeLessThan(SHUTDOWN_TIMEOUT_MS);
    expect(SHUTDOWN_TIMEOUT_MS).toBeLessThan(PM2_KILL_TIMEOUT_MS);
  });

  it('gives in-flight conversions room past the old 23s window that force-killed large decks', () => {
    expect(POOL_DRAIN_TIMEOUT_MS).toBeGreaterThanOrEqual(60_000);
  });
});
