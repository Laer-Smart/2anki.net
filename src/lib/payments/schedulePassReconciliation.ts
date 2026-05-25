import type { Knex } from 'knex';
import { reconcilePassGrants } from './reconcilePassGrants';
import type { StripeClient } from './reconcilePassGrants';

export const PASS_RECONCILIATION_INTERVAL_MS = 15 * 60 * 1000;
export const PASS_RECONCILIATION_WINDOW_HOURS = 1;

export const schedulePassReconciliation = (
  stripe: StripeClient,
  db: Knex,
  options: { intervalMs?: number; windowHours?: number } = {}
): NodeJS.Timeout => {
  const intervalMs = options.intervalMs ?? PASS_RECONCILIATION_INTERVAL_MS;
  const windowHours = options.windowHours ?? PASS_RECONCILIATION_WINDOW_HOURS;

  const tick = async () => {
    try {
      const result = await reconcilePassGrants(stripe, db, windowHours);
      if (result.checked > 0 || result.alerts.length > 0) {
        console.info('[pass-reconcile] completed', {
          checked: result.checked,
          healed: result.healed,
          alerts: result.alerts.length,
        });
      }
    } catch (error) {
      console.error('[pass-reconcile] reconciliation tick failed:', error);
    }
  };

  const handle = setInterval(tick, intervalMs);
  handle.unref();
  return handle;
};
