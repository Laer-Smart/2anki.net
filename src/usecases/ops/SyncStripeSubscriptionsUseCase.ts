export interface SyncStripeSubscriptionsResult {
  started: boolean;
  alreadyRunning: boolean;
}

export type StripeSubscriptionSync = () => Promise<unknown>;

/**
 * Triggers the Stripe → DB subscription sync on demand from /ops.
 *
 * The sync paginates every active Stripe subscription and then reconciles each
 * active DB row against Stripe, so it can run for minutes. Holding the HTTP
 * request open that long risks a proxy timeout, so we fire it in the background
 * and return immediately. A process-wide lock prevents overlapping runs from
 * doubling the Stripe API load.
 */
export class SyncStripeSubscriptionsUseCase {
  private running = false;

  constructor(private readonly runSync: StripeSubscriptionSync) {}

  execute(): SyncStripeSubscriptionsResult {
    if (this.running) {
      return { started: false, alreadyRunning: true };
    }

    this.running = true;
    void this.runSync()
      .then(() => {
        console.info('[ops] stripe subscription sync finished');
      })
      .catch((error) => {
        console.error('[ops] stripe subscription sync failed', error);
      })
      .finally(() => {
        this.running = false;
      });

    return { started: true, alreadyRunning: false };
  }
}
