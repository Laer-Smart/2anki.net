import express, { NextFunction, RequestHandler } from 'express';
import { getDatabase } from '../../data_layer';
import ApiKeyRepository, {
  IApiKeyRepository,
} from '../../data_layer/ApiKeyRepository';
import UsersRepository from '../../data_layer/UsersRepository';
import TokenRepository from '../../data_layer/TokenRepository';
import AuthenticationService from '../../services/AuthenticationService';
import {
  extractApiKeyFromHeader,
  hashApiKey,
} from '../../lib/apiKeys/apiKeyToken';
import { applyUserLocals } from './configureUserLocal';
import { getEventsSink } from '../../services/events/eventsSinkInstance';

const USAGE_EVENT_THROTTLE_MS = 60_000;
const lastUsageEventAt = new Map<number, number>();

export interface RequireApiKeyDeps {
  apiKeyRepo?: IApiKeyRepository;
  usersRepo?: UsersRepository;
  authService?: AuthenticationService;
  now?: () => Date;
}

function recordUsage(keyId: number, userId: number, at: number) {
  const previous = lastUsageEventAt.get(keyId) ?? 0;
  if (at - previous < USAGE_EVENT_THROTTLE_MS) {
    return;
  }
  lastUsageEventAt.set(keyId, at);
  getEventsSink().record({
    name: 'api_key_used',
    user_id: userId,
    anonymous_id: null,
    props: {},
    created_at: new Date(at),
  });
}

/**
 * Bearer API-key authentication. Resolves `Authorization: Bearer sk_live_...`
 * to the owning user and populates `res.locals` via the shared
 * `applyUserLocals`, so every downstream quota/paying check behaves exactly as
 * it does for a session cookie. Fails closed with 401 on a missing, malformed,
 * unknown, or revoked key — it never falls through to anonymous.
 */
export function makeRequireApiKey(
  deps: RequireApiKeyDeps = {}
): RequestHandler {
  return async (
    req: express.Request,
    res: express.Response,
    next: NextFunction
  ) => {
    const raw = extractApiKeyFromHeader(req.headers.authorization);
    if (raw == null) {
      return res.status(401).json({ message: 'API key required' });
    }

    const database = getDatabase();
    const apiKeyRepo = deps.apiKeyRepo ?? new ApiKeyRepository(database);
    const usersRepo = deps.usersRepo ?? new UsersRepository(database);

    const active = await apiKeyRepo.findActiveByHash(hashApiKey(raw));
    if (active == null) {
      return res.status(401).json({ message: 'Invalid API key' });
    }

    const user = await usersRepo.getById(String(active.user_id));
    if (user == null) {
      return res.status(401).json({ message: 'Invalid API key' });
    }

    const authService =
      deps.authService ??
      new AuthenticationService(new TokenRepository(database), usersRepo);
    await applyUserLocals(
      res,
      { ...user, owner: user.id },
      authService,
      database
    );

    const at = (deps.now ?? (() => new Date()))().getTime();
    void apiKeyRepo.touchLastUsed(active.id, new Date(at));
    recordUsage(active.id, active.user_id, at);

    return next();
  };
}

const RequireApiKey = makeRequireApiKey();
export default RequireApiKey;

/**
 * Accept EITHER a bearer API key OR the existing gate. Key-first: when an
 * `sk_live_...` bearer is present it runs `RequireApiKey` (fail-closed); with no
 * bearer it runs `fallback` unchanged, so the browser/session path is
 * byte-identical. Used to add key auth to routes without touching their cookie
 * behavior — e.g. `acceptKeyOr(RequireAllowedOrigin)` lets a token client skip
 * the browser Origin allowlist while a browser request still enforces it.
 */
export function acceptKeyOr(fallback: RequestHandler): RequestHandler {
  const requireApiKey = makeRequireApiKey();
  return (req: express.Request, res: express.Response, next: NextFunction) => {
    const raw = extractApiKeyFromHeader(req.headers.authorization);
    if (raw != null) {
      return requireApiKey(req, res, next);
    }
    return fallback(req, res, next);
  };
}
