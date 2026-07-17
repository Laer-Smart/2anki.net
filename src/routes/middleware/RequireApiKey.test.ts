import express from 'express';

jest.mock('../../data_layer', () => ({
  getDatabase: jest.fn(() => ({})),
}));

jest.mock('../../services/events/eventsSinkInstance', () => ({
  getEventsSink: jest.fn(() => ({ record: jest.fn() })),
}));

// Default (non-injected) construction path must not touch a real DB.
jest.mock('../../data_layer/ApiKeyRepository', () => ({
  __esModule: true,
  default: class {
    findActiveByHash = jest.fn(async () => null);
    touchLastUsed = jest.fn(async () => undefined);
  },
}));

import { makeRequireApiKey, acceptKeyOr } from './RequireApiKey';
import { generateApiKey, hashApiKey } from '../../lib/apiKeys/apiKeyToken';
import { IApiKeyRepository } from '../../data_layer/ApiKeyRepository';

interface FakeResponse {
  statusCode: number;
  body: unknown;
  locals: Record<string, unknown>;
  status: jest.Mock;
  json: jest.Mock;
}

function makeResponse(): FakeResponse {
  const state = {
    statusCode: 200,
    body: undefined,
    locals: {},
  } as FakeResponse;
  state.status = jest.fn((code: number) => {
    state.statusCode = code;
    return state;
  });
  state.json = jest.fn((body: unknown) => {
    state.body = body;
    return state;
  });
  return state;
}

function makeRequest(authorization?: string): express.Request {
  return {
    headers: authorization == null ? {} : { authorization },
  } as express.Request;
}

const fakeAuthService = {
  getIsSubscriber: jest.fn(async () => true),
  getSubscriptionInfo: jest.fn(async () => ({ active: false })),
} as never;

function makeApiKeyRepo(
  overrides: Partial<IApiKeyRepository> = {}
): IApiKeyRepository {
  return {
    create: jest.fn(),
    findActiveByHash: jest.fn(async () => null),
    listByUser: jest.fn(async () => []),
    revoke: jest.fn(async () => true),
    touchLastUsed: jest.fn(async () => undefined),
    ...overrides,
  } as IApiKeyRepository;
}

const usersRepo = {
  getById: jest.fn(async () => ({
    id: 55,
    owner: 55,
    email: 'dev@example.com',
    patreon: true,
    developer_access: false,
    chat_consent_at: null,
  })),
} as never;

describe('makeRequireApiKey', () => {
  const key = generateApiKey();

  it('resolves a valid key to the owner and populates locals like a session', async () => {
    const apiKeyRepo = makeApiKeyRepo({
      findActiveByHash: jest.fn(async (hash: string) =>
        hash === hashApiKey(key.raw) ? { id: 9, user_id: 55 } : null
      ),
    });
    const mw = makeRequireApiKey({
      apiKeyRepo,
      usersRepo,
      authService: fakeAuthService,
    });
    const res = makeResponse();
    const next = jest.fn();

    await mw(makeRequest(`Bearer ${key.raw}`), res as never, next);

    expect(next).toHaveBeenCalled();
    expect(res.locals.owner).toBe(55);
    expect(res.locals.email).toBe('dev@example.com');
    expect(res.locals.patreon).toBe(true);
    expect(apiKeyRepo.touchLastUsed).toHaveBeenCalledWith(9, expect.any(Date));
  });

  it('fails closed with 401 when the key is unknown', async () => {
    const mw = makeRequireApiKey({
      apiKeyRepo: makeApiKeyRepo(),
      usersRepo,
      authService: fakeAuthService,
    });
    const res = makeResponse();
    const next = jest.fn();

    await mw(makeRequest('Bearer sk_live_unknown'), res as never, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });

  it('fails closed with 401 when no key is present (no anonymous fall-through)', async () => {
    const mw = makeRequireApiKey({
      apiKeyRepo: makeApiKeyRepo(),
      usersRepo,
      authService: fakeAuthService,
    });
    const res = makeResponse();
    const next = jest.fn();

    await mw(makeRequest(), res as never, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });
});

describe('acceptKeyOr', () => {
  it('runs the fallback (session/origin gate) when there is no bearer key', () => {
    const fallback = jest.fn();
    const mw = acceptKeyOr(fallback);
    const next = jest.fn();
    mw(makeRequest(), makeResponse() as never, next);
    expect(fallback).toHaveBeenCalled();
  });

  it('does NOT run the fallback when a bearer key is present (key path takes over)', () => {
    const fallback = jest.fn();
    const mw = acceptKeyOr(fallback);
    const next = jest.fn();
    mw(makeRequest('Bearer sk_live_something'), makeResponse() as never, next);
    expect(fallback).not.toHaveBeenCalled();
  });
});
