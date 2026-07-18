import { Response } from 'express';
import type { OAuthClientInformationFull } from '@modelcontextprotocol/sdk/shared/auth.js';

import { KnexOAuthProvider, McpOAuthDeps } from './KnexOAuthProvider';
import {
  CreateAuthorizationCodeInput,
  IMcpAuthorizationCodeRepository,
  StoredAuthorizationCode,
} from '../../../data_layer/McpAuthorizationCodeRepository';
import {
  CreateTokenInput,
  IMcpTokenRepository,
  StoredToken,
} from '../../../data_layer/McpTokenRepository';
import {
  IMcpOAuthClientRepository,
  StoredMcpClient,
} from '../../../data_layer/McpOAuthClientRepository';
import { hashSecret } from './tokens';

const RESOURCE = 'https://2anki.net/mcp';

class FakeClientRepo implements IMcpOAuthClientRepository {
  clients = new Map<string, StoredMcpClient>();
  async create(client: StoredMcpClient): Promise<StoredMcpClient> {
    this.clients.set(client.client_id, client);
    return client;
  }
  async findById(clientId: string): Promise<StoredMcpClient | null> {
    return this.clients.get(clientId) ?? null;
  }
}

class FakeCodeRepo implements IMcpAuthorizationCodeRepository {
  rows: StoredAuthorizationCode[] = [];
  private byHash = new Map<string, StoredAuthorizationCode>();
  private nextId = 1;
  async create(input: CreateAuthorizationCodeInput): Promise<void> {
    const row: StoredAuthorizationCode = {
      id: this.nextId++,
      client_id: input.client_id,
      user_id: input.user_id,
      redirect_uri: input.redirect_uri,
      code_challenge: input.code_challenge,
      scopes: input.scopes,
      resource: input.resource,
      expires_at: input.expires_at,
      consumed_at: null,
    };
    this.rows.push(row);
    this.byHash.set(input.code_hash, row);
  }
  async findByHash(codeHash: string): Promise<StoredAuthorizationCode | null> {
    return this.byHash.get(codeHash) ?? null;
  }
  seed(codeHash: string, row: Omit<StoredAuthorizationCode, 'id'>): void {
    const stored = { id: this.nextId++, ...row };
    this.byHash.set(codeHash, stored);
    this.rows.push(stored);
  }
  async consume(id: number, now: Date): Promise<boolean> {
    for (const row of this.byHash.values()) {
      if (row.id === id && row.consumed_at == null) {
        row.consumed_at = now;
        return true;
      }
    }
    return false;
  }
}

class FakeTokenRepo implements IMcpTokenRepository {
  access = new Map<string, StoredToken>();
  refresh = new Map<string, StoredToken>();
  private id = 1;
  async createAccessToken(input: CreateTokenInput): Promise<void> {
    this.access.set(input.token_hash, {
      id: this.id++,
      revoked_at: null,
      ...input,
    });
  }
  async createRefreshToken(input: CreateTokenInput): Promise<void> {
    this.refresh.set(input.token_hash, {
      id: this.id++,
      revoked_at: null,
      ...input,
    });
  }
  async findAccessTokenByHash(h: string): Promise<StoredToken | null> {
    return this.access.get(h) ?? null;
  }
  async findRefreshTokenByHash(h: string): Promise<StoredToken | null> {
    return this.refresh.get(h) ?? null;
  }
  async revokeAccessTokenByHash(h: string): Promise<void> {
    const t = this.access.get(h);
    if (t) t.revoked_at = new Date();
  }
  async revokeRefreshTokenByHash(h: string): Promise<void> {
    const t = this.refresh.get(h);
    if (t) t.revoked_at = new Date();
  }
  async revokeAllForUserClient(): Promise<void> {}
}

function fakeResponse(cookieToken?: string) {
  const calls = {
    redirectedTo: null as string | null,
    cookies: [] as { name: string; value: string }[],
  };
  const res = {
    req: {
      cookies: cookieToken != null ? { token: cookieToken } : {},
      originalUrl: '/authorize?client_id=abc&state=xyz',
    },
    redirect(target: string) {
      calls.redirectedTo = target;
    },
    cookie(name: string, value: string) {
      calls.cookies.push({ name, value });
    },
  } as unknown as Response;
  return { res, calls };
}

function makeProvider(overrides: Partial<McpOAuthDeps> = {}) {
  const clientRepo = new FakeClientRepo();
  const codeRepo = new FakeCodeRepo();
  const tokenRepo = new FakeTokenRepo();
  const now = new Date('2026-07-18T00:00:00.000Z');
  const authService = {
    getUserFrom: jest.fn(async (token: string) => {
      if (token === 'valid-session') {
        return { id: 42, email: 'a@b.co', developer_access: true };
      }
      if (token === 'valid-no-dev') {
        return { id: 43, email: 'c@d.co', developer_access: false };
      }
      return null;
    }),
  } as unknown as McpOAuthDeps['authService'];
  const usersRepo = {
    getById: jest.fn(async (id: string) =>
      id === '42' ? { id: 42, email: 'a@b.co' } : null
    ),
  } as unknown as McpOAuthDeps['usersRepo'];
  const provider = new KnexOAuthProvider({
    clientRepo,
    codeRepo,
    tokenRepo,
    authService,
    usersRepo,
    config: { resourceUrl: new URL(RESOURCE), loginPath: '/login' },
    now: () => now,
    ...overrides,
  });
  return { provider, clientRepo, codeRepo, tokenRepo, now };
}

const CLIENT: OAuthClientInformationFull = {
  client_id: 'client-1',
  redirect_uris: ['https://claude.ai/callback'],
  token_endpoint_auth_method: 'none',
};

describe('KnexOAuthProvider client registration', () => {
  it('registers a public client and never persists a secret', async () => {
    const { provider, clientRepo } = makeProvider();
    const result = await provider.clientsStore.registerClient!({
      redirect_uris: ['https://claude.ai/callback'],
      client_name: 'Claude',
    } as OAuthClientInformationFull);
    expect(result.token_endpoint_auth_method).toBe('none');
    expect(result.client_secret).toBeUndefined();
    const stored = await clientRepo.findById(result.client_id);
    expect(stored?.token_endpoint_auth_method).toBe('none');
  });

  it.each([
    ['http non-loopback', ['http://evil.example/cb']],
    ['fragment', ['https://claude.ai/cb#frag']],
    ['not a url', ['not-a-url']],
    ['empty list', []],
  ])('rejects invalid redirect_uris: %s', async (_label, uris) => {
    const { provider } = makeProvider();
    await expect(
      provider.clientsStore.registerClient!({
        redirect_uris: uris,
      } as OAuthClientInformationFull)
    ).rejects.toThrow();
  });

  it('allows http loopback redirect for native clients', async () => {
    const { provider } = makeProvider();
    const result = await provider.clientsStore.registerClient!({
      redirect_uris: ['http://127.0.0.1:1234/cb'],
    } as OAuthClientInformationFull);
    expect(result.redirect_uris).toContain('http://127.0.0.1:1234/cb');
  });
});

describe('KnexOAuthProvider authorize', () => {
  it('redirects to login and sets first-touch when not signed in', async () => {
    const { provider } = makeProvider();
    const { res, calls } = fakeResponse();
    await provider.authorize(
      CLIENT,
      {
        codeChallenge: 'chal',
        redirectUri: 'https://claude.ai/callback',
        state: 'xyz',
      },
      res
    );
    expect(calls.redirectedTo).toContain('/login?next=');
    expect(calls.cookies[0].name).toBe('first_touch');
    expect(calls.cookies[0].value).toContain('/mcp');
  });

  it('mints a code bound to PKCE and redirects with code+state when signed in', async () => {
    const { provider, codeRepo } = makeProvider();
    const { res, calls } = fakeResponse('valid-session');
    await provider.authorize(
      CLIENT,
      {
        codeChallenge: 'chal-123',
        redirectUri: 'https://claude.ai/callback',
        state: 'xyz',
      },
      res
    );
    expect(calls.redirectedTo).toMatch(
      /^https:\/\/claude\.ai\/callback\?code=mcp_ac_/
    );
    expect(calls.redirectedTo).toContain('state=xyz');
    expect(codeRepo.rows).toHaveLength(1);
    expect(codeRepo.rows[0].code_challenge).toBe('chal-123');
    expect(codeRepo.rows[0].user_id).toBe(42);
  });

  it('denies a signed-in user without developer_access and issues no code', async () => {
    const { provider, codeRepo } = makeProvider();
    const { res, calls } = fakeResponse('valid-no-dev');
    await provider.authorize(
      CLIENT,
      {
        codeChallenge: 'chal',
        redirectUri: 'https://claude.ai/callback',
        state: 'xyz',
      },
      res
    );
    expect(calls.redirectedTo).toContain('error=access_denied');
    expect(calls.redirectedTo).toContain('state=xyz');
    expect(calls.redirectedTo).not.toContain('code=');
    expect(codeRepo.rows).toHaveLength(0);
  });
});

describe('KnexOAuthProvider token exchange', () => {
  function seedCode(
    codeRepo: FakeCodeRepo,
    code: string,
    overrides: Partial<StoredAuthorizationCode> = {}
  ) {
    codeRepo.seed(hashSecret(code), {
      client_id: 'client-1',
      user_id: 42,
      redirect_uri: 'https://claude.ai/callback',
      code_challenge: 'chal',
      scopes: ['mcp'],
      resource: RESOURCE,
      expires_at: new Date('2026-07-18T00:04:00.000Z'),
      consumed_at: null,
      ...overrides,
    });
  }

  it('exchanges a valid code for an access + refresh token pair', async () => {
    const { provider, codeRepo, tokenRepo } = makeProvider();
    seedCode(codeRepo, 'the-code');
    const tokens = await provider.exchangeAuthorizationCode(
      CLIENT,
      'the-code',
      undefined,
      'https://claude.ai/callback',
      new URL(RESOURCE)
    );
    expect(tokens.access_token).toMatch(/^mcp_at_/);
    expect(tokens.refresh_token).toMatch(/^mcp_rt_/);
    expect(tokenRepo.access.size).toBe(1);
    expect(tokenRepo.refresh.size).toBe(1);
  });

  it('rejects a reused authorization code', async () => {
    const { provider, codeRepo } = makeProvider();
    seedCode(codeRepo, 'once');
    await provider.exchangeAuthorizationCode(
      CLIENT,
      'once',
      undefined,
      'https://claude.ai/callback'
    );
    await expect(
      provider.exchangeAuthorizationCode(
        CLIENT,
        'once',
        undefined,
        'https://claude.ai/callback'
      )
    ).rejects.toThrow(/already used/);
  });

  it('rejects an expired code', async () => {
    const { provider, codeRepo } = makeProvider();
    seedCode(codeRepo, 'stale', {
      expires_at: new Date('2026-07-17T23:00:00.000Z'),
    });
    await expect(
      provider.exchangeAuthorizationCode(
        CLIENT,
        'stale',
        undefined,
        'https://claude.ai/callback'
      )
    ).rejects.toThrow(/expired/);
  });

  it('rejects a redirect_uri mismatch', async () => {
    const { provider, codeRepo } = makeProvider();
    seedCode(codeRepo, 'code');
    await expect(
      provider.exchangeAuthorizationCode(
        CLIENT,
        'code',
        undefined,
        'https://evil.example/cb'
      )
    ).rejects.toThrow(/redirect_uri/);
  });

  it('rejects a code that belongs to a different client', async () => {
    const { provider, codeRepo } = makeProvider();
    seedCode(codeRepo, 'code', { client_id: 'other-client' });
    await expect(
      provider.exchangeAuthorizationCode(
        CLIENT,
        'code',
        undefined,
        'https://claude.ai/callback'
      )
    ).rejects.toThrow(/Invalid authorization code/);
  });

  it('rejects a resource that does not match the server', async () => {
    const { provider, codeRepo } = makeProvider();
    seedCode(codeRepo, 'code');
    await expect(
      provider.exchangeAuthorizationCode(
        CLIENT,
        'code',
        undefined,
        'https://claude.ai/callback',
        new URL('https://evil.example/mcp')
      )
    ).rejects.toThrow(/resource/);
  });
});

describe('KnexOAuthProvider refresh + verify + revoke', () => {
  async function issue(provider: KnexOAuthProvider, codeRepo: FakeCodeRepo) {
    codeRepo.seed(hashSecret('c'), {
      client_id: 'client-1',
      user_id: 42,
      redirect_uri: 'https://claude.ai/callback',
      code_challenge: 'chal',
      scopes: ['mcp'],
      resource: RESOURCE,
      expires_at: new Date('2026-07-18T00:04:00.000Z'),
      consumed_at: null,
    });
    return provider.exchangeAuthorizationCode(
      CLIENT,
      'c',
      undefined,
      'https://claude.ai/callback'
    );
  }

  it('rotates the refresh token and revokes the old one', async () => {
    const { provider, codeRepo, tokenRepo } = makeProvider();
    const first = await issue(provider, codeRepo);
    const rotated = await provider.exchangeRefreshToken(
      CLIENT,
      first.refresh_token!
    );
    expect(rotated.refresh_token).not.toEqual(first.refresh_token);
    expect(
      tokenRepo.refresh.get(hashSecret(first.refresh_token!))?.revoked_at
    ).not.toBeNull();
  });

  it('verifies a live access token and resolves the owner', async () => {
    const { provider, codeRepo } = makeProvider();
    const tokens = await issue(provider, codeRepo);
    const info = await provider.verifyAccessToken(tokens.access_token);
    expect(info.clientId).toBe('client-1');
    expect(info.extra?.owner).toBe(42);
    expect(info.resource?.toString()).toContain('/mcp');
  });

  it('rejects a revoked access token', async () => {
    const { provider, codeRepo, tokenRepo } = makeProvider();
    const tokens = await issue(provider, codeRepo);
    const t = tokenRepo.access.get(hashSecret(tokens.access_token));
    if (t) t.revoked_at = new Date();
    await expect(
      provider.verifyAccessToken(tokens.access_token)
    ).rejects.toThrow(/revoked/);
  });

  it('rejects an unknown access token', async () => {
    const { provider } = makeProvider();
    await expect(provider.verifyAccessToken('mcp_at_nope')).rejects.toThrow(
      /Invalid access token/
    );
  });
});
