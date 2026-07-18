import express from 'express';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import type { OAuthServerProvider } from '@modelcontextprotocol/sdk/server/auth/provider.js';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';

import { createMcpRouter } from './createMcpRouter';

const RESOURCE = 'https://2anki.net/mcp';

function fakeProvider(): OAuthServerProvider {
  return {
    clientsStore: {
      getClient: async () => undefined,
      registerClient: async (client) => ({
        ...client,
        client_id: 'generated',
        client_id_issued_at: 1,
      }),
    },
    authorize: async () => {},
    challengeForAuthorizationCode: async () => 'chal',
    exchangeAuthorizationCode: async () => ({
      access_token: 'a',
      token_type: 'bearer',
    }),
    exchangeRefreshToken: async () => ({
      access_token: 'a',
      token_type: 'bearer',
    }),
    verifyAccessToken: async (token: string): Promise<AuthInfo> => {
      if (token !== 'good') {
        throw new Error('bad token');
      }
      return {
        token,
        clientId: 'client-1',
        scopes: ['mcp'],
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
        resource: new URL(RESOURCE),
        extra: { owner: '1' },
      };
    },
  };
}

async function withServer(
  run: (baseUrl: string) => Promise<void>,
  onPost: express.RequestHandler = (_req, res) => {
    res.json({ ok: true });
  },
  mountExtra?: (app: express.Express) => void
): Promise<void> {
  const app = express();
  app.use(express.json());
  app.use(
    createMcpRouter({
      provider: fakeProvider(),
      issuerUrl: new URL('https://2anki.net'),
      resourceUrl: new URL(RESOURCE),
      onAuthenticatedPost: onPost,
    })
  );
  if (mountExtra) {
    mountExtra(app);
  }
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const { port } = server.address() as AddressInfo;
  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

describe('McpRouter discovery', () => {
  it('serves authorization-server metadata with the standard endpoints', async () => {
    await withServer(async (base) => {
      const res = await fetch(`${base}/.well-known/oauth-authorization-server`);
      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, string>;
      expect(body.issuer).toBe('https://2anki.net/');
      expect(body.authorization_endpoint).toBe(
        'https://2anki.net/mcp/authorize'
      );
      expect(body.token_endpoint).toBe('https://2anki.net/mcp/token');
      expect(body.registration_endpoint).toBe('https://2anki.net/mcp/register');
    });
  });

  it('serves protected-resource metadata for the /mcp resource', async () => {
    await withServer(async (base) => {
      const res = await fetch(
        `${base}/.well-known/oauth-protected-resource/mcp`
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as { resource: string };
      expect(body.resource).toBe(RESOURCE);
    });
  });
});

describe('McpRouter bearer enforcement', () => {
  it('rejects an unauthenticated POST /mcp with a WWW-Authenticate challenge', async () => {
    await withServer(async (base) => {
      const res = await fetch(`${base}/mcp`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'ping', id: 1 }),
      });
      expect(res.status).toBe(401);
      expect(res.headers.get('www-authenticate')).toContain('Bearer');
    });
  });

  it('reaches the authenticated handler with a valid bearer token', async () => {
    let reachedOwner: unknown = null;
    await withServer(
      async (base) => {
        const res = await fetch(`${base}/mcp`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            authorization: 'Bearer good',
          },
          body: JSON.stringify({ jsonrpc: '2.0', method: 'ping', id: 1 }),
        });
        expect(res.status).toBe(200);
      },
      (req, res) => {
        reachedOwner = req.auth?.extra?.owner;
        res.json({ ok: true });
      }
    );
    expect(reachedOwner).toBe('1');
  });

  it('returns 405 for GET /mcp with a valid token', async () => {
    await withServer(async (base) => {
      const res = await fetch(`${base}/mcp`, {
        headers: { authorization: 'Bearer good' },
      });
      expect(res.status).toBe(405);
      expect(res.headers.get('allow')).toBe('POST');
    });
  });
});

describe('McpRouter endpoint namespacing (no /register collision)', () => {
  it('does not shadow GET /register — the signup SPA still serves', async () => {
    await withServer(
      async (base) => {
        const res = await fetch(`${base}/register`);
        expect(res.status).toBe(200);
        expect(await res.text()).toBe('SIGNUP_SPA');
      },
      undefined,
      (app) => {
        app.get('/register', (_req, res) => res.send('SIGNUP_SPA'));
      }
    );
  });

  it('registers a client via Dynamic Client Registration at /mcp/register', async () => {
    await withServer(async (base) => {
      const res = await fetch(`${base}/mcp/register`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ redirect_uris: ['https://claude.ai/callback'] }),
      });
      expect(res.status).toBe(201);
      const body = (await res.json()) as { client_id?: string };
      expect(typeof body.client_id).toBe('string');
    });
  });

  it('routes POST /mcp (resource) and /mcp/authorize (AS) to distinct handlers', async () => {
    await withServer(async (base) => {
      const authorize = await fetch(`${base}/mcp/authorize`, {
        redirect: 'manual',
      });
      expect(authorize.status).not.toBe(405);

      const resource = await fetch(`${base}/mcp`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'ping', id: 1 }),
      });
      expect(resource.status).toBe(401);
    });
  });
});
