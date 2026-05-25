import { schedulePassReconciliation, PASS_RECONCILIATION_INTERVAL_MS } from './schedulePassReconciliation';
import type { StripeClient } from './reconcilePassGrants';

jest.mock('./reconcilePassGrants', () => ({
  reconcilePassGrants: jest.fn(),
}));

import { reconcilePassGrants } from './reconcilePassGrants';

const makeStripe = (): StripeClient => ({ paymentIntents: { list: jest.fn() } });
const makeDb = () => ({} as import('knex').Knex);

describe('schedulePassReconciliation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    (reconcilePassGrants as jest.Mock).mockReset();
    (reconcilePassGrants as jest.Mock).mockResolvedValue({ checked: 0, healed: 0, alerts: [] });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns a NodeJS.Timeout handle', () => {
    const handle = schedulePassReconciliation(makeStripe(), makeDb());
    expect(handle).toBeDefined();
    clearInterval(handle);
  });

  it('uses 15-minute default interval', () => {
    expect(PASS_RECONCILIATION_INTERVAL_MS).toBe(15 * 60 * 1000);
  });

  it('calls reconcilePassGrants after interval fires', async () => {
    const handle = schedulePassReconciliation(makeStripe(), makeDb(), { intervalMs: 100 });

    jest.advanceTimersByTime(100);
    await Promise.resolve();
    await Promise.resolve();

    expect(reconcilePassGrants).toHaveBeenCalledTimes(1);
    clearInterval(handle);
  });

  it('respects custom intervalMs option', async () => {
    const handle = schedulePassReconciliation(makeStripe(), makeDb(), { intervalMs: 500 });

    jest.advanceTimersByTime(499);
    await Promise.resolve();
    expect(reconcilePassGrants).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    await Promise.resolve();
    await Promise.resolve();
    expect(reconcilePassGrants).toHaveBeenCalledTimes(1);

    clearInterval(handle);
  });

  it('does not fire after the handle is cleared', async () => {
    const handle = schedulePassReconciliation(makeStripe(), makeDb(), { intervalMs: 100 });

    jest.advanceTimersByTime(100);
    await Promise.resolve();
    await Promise.resolve();
    expect(reconcilePassGrants).toHaveBeenCalledTimes(1);

    clearInterval(handle);

    jest.advanceTimersByTime(100);
    await Promise.resolve();
    await Promise.resolve();
    expect(reconcilePassGrants).toHaveBeenCalledTimes(1);
  });
});
