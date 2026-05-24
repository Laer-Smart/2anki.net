import { configureUserLocal } from './configureUserLocal';
import { InMemoryAnonymousPassRepository } from '../../data_layer/AnonymousPassRepository';
import type { Request, Response } from 'express';

function makeRes(): Response {
  return { locals: {} } as Response;
}

function makeReq(headers: Record<string, string> = {}, cookies: Record<string, string> = {}): Request {
  return { headers, cookies } as unknown as Request;
}

const noOpAuthService = {
  getUserFrom: async () => null,
  getIsSubscriber: async () => false,
  getSubscriptionInfo: async () => null,
} as never;

const noDatabase = {} as never;

describe('configureUserLocal — anonymous pass token', () => {
  const now = new Date('2026-06-01T12:00:00Z');

  it('sets subscriber=true when a valid unexpired anonymous pass token is in X-Pass-Token header', async () => {
    const anonRepo = new InMemoryAnonymousPassRepository();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    await anonRepo.insert({ stripeSessionId: 'cs_valid', kind: '24h', expiresAt, paymentIntentId: 'pi_1' });

    const req = makeReq({ 'x-pass-token': 'cs_valid' });
    const res = makeRes();

    await configureUserLocal(req, res, noOpAuthService, noDatabase, anonRepo, now);

    expect(res.locals.subscriber).toBe(true);
    expect(res.locals.passKind).toBe('24h');
  });

  it('does not set subscriber=true for an expired anonymous pass token', async () => {
    const anonRepo = new InMemoryAnonymousPassRepository();
    const expiresAt = new Date(now.getTime() - 1000);
    await anonRepo.insert({ stripeSessionId: 'cs_expired', kind: '24h', expiresAt, paymentIntentId: 'pi_2' });

    const req = makeReq({ 'x-pass-token': 'cs_expired' });
    const res = makeRes();

    await configureUserLocal(req, res, noOpAuthService, noDatabase, anonRepo, now);

    expect(res.locals.subscriber).toBeUndefined();
  });

  it('does not set subscriber=true when no X-Pass-Token header is present', async () => {
    const anonRepo = new InMemoryAnonymousPassRepository();

    const req = makeReq();
    const res = makeRes();

    await configureUserLocal(req, res, noOpAuthService, noDatabase, anonRepo, now);

    expect(res.locals.subscriber).toBeUndefined();
  });
});
