import express from 'express';
import http from 'node:http';
import { AddressInfo } from 'node:net';

jest.mock('../data_layer', () => ({
  getDatabase: jest.fn(() => ({})),
}));

jest.mock('./middleware/RequireOpsAccess', () => {
  type State = { allow: boolean };
  const state = (globalThis as unknown as { __opsErrorsState?: State });
  if (state.__opsErrorsState == null) {
    state.__opsErrorsState = { allow: false };
  }
  const shared = state.__opsErrorsState;
  return {
    __esModule: true,
    default: (
      _req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      if (!shared.allow) {
        res.status(401).end();
        return;
      }
      next();
    },
  };
});

jest.mock('../data_layer/ErrorEventRepository', () => ({
  ErrorEventRepository: class {
    async listGroups() {
      return [
        {
          message_hash: 'a'.repeat(64),
          message: 'TypeError: x is null',
          stack: 'at App.tsx:10',
          url: 'https://2anki.net',
          release: 'abc12345',
          source: 'web',
          user_id: null,
          user_agent: 'Mozilla/5.0',
          first_seen: '2026-05-01T00:00:00.000Z',
          last_seen: '2026-05-24T10:00:00.000Z',
          occurrences: 3,
        },
      ];
    }
    async countGroups() {
      return 1;
    }
    async insert() {}
    async existsWithinWindow() { return false; }
  },
}));

import OpsErrorsRouter from './OpsErrorsRouter';

type GlobalWithState = { __opsErrorsState: { allow: boolean } };
const opsErrorsState = (globalThis as unknown as GlobalWithState).__opsErrorsState;

const startServer = async (allowOps: boolean) => {
  opsErrorsState.allow = allowOps;
  const app = express();
  app.use(OpsErrorsRouter());
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as AddressInfo;
  return {
    server,
    url: `http://127.0.0.1:${address.port}`,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
};

describe('OpsErrorsRouter GET /api/ops/errors', () => {
  it('returns 401 without admin auth', async () => {
    const { url, close } = await startServer(false);
    try {
      const res = await fetch(`${url}/api/ops/errors`);
      expect(res.status).toBe(401);
    } finally {
      await close();
    }
  });

  it('returns 200 with the groups shape for the ops owner', async () => {
    const { url, close } = await startServer(true);
    try {
      const res = await fetch(`${url}/api/ops/errors`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toMatchObject({
        groups: expect.any(Array),
        totalGroups: expect.any(Number),
      });
    } finally {
      await close();
    }
  });

  it('does not expose ip_hash in the response', async () => {
    const { url, close } = await startServer(true);
    try {
      const res = await fetch(`${url}/api/ops/errors`);
      const text = await res.text();
      expect(text).not.toContain('ip_hash');
    } finally {
      await close();
    }
  });

  it('returns groups with the expected shape', async () => {
    const { url, close } = await startServer(true);
    try {
      const res = await fetch(`${url}/api/ops/errors`);
      const body = await res.json() as { groups: unknown[] };
      expect(body.groups[0]).toMatchObject({
        message_hash: expect.any(String),
        message: expect.any(String),
        source: expect.any(String),
        first_seen: expect.any(String),
        last_seen: expect.any(String),
        occurrences: expect.any(Number),
      });
    } finally {
      await close();
    }
  });
});
