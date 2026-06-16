/**
 * Ops command: reconcile orphaned active Stripe subscriptions.
 *
 * An orphan is an active subscription whose Stripe email no longer matches any
 * account (no users.email, no linked_email, no stripe_customer_id). These are
 * the `unlinked_payment` alert source — mostly legacy subs created before the
 * `subscription_data.metadata.user_id` instrumentation, where the payer's Stripe
 * email drifted from their registered account email. They are paying customers
 * who can't access what they bought.
 *
 * Default run is READ-ONLY: lists the orphans (emails masked) so you can eyeball
 * the tail. `--apply` sends the cooldown-guarded subscription-recovery email that
 * asks each payer to reconnect their purchase, and requires a typed confirmation.
 *
 * Run from the repo root with the prod/staging env loaded:
 *   npx tsx --env-file=.env ops/commands/reconcile-orphaned-subscriptions.ts
 *   npx tsx --env-file=.env ops/commands/reconcile-orphaned-subscriptions.ts --apply
 */
import readline from 'node:readline';

import { getDatabase } from '../../src/data_layer';
import { getStripe } from '../../src/lib/integrations/stripe';
import { getDefaultEmailService } from '../../src/services/EmailService/EmailService';
import { OrphanedSubscriptionsRepository } from '../../src/data_layer/OrphanedSubscriptionsRepository';
import { SubscriptionRecoveryNotificationsRepository } from '../../src/data_layer/SubscriptionRecoveryNotificationsRepository';
import { GetOrphanedSubscriptionsUseCase } from '../../src/usecases/ops/GetOrphanedSubscriptionsUseCase';
import { ReconcileOrphanedSubscriptionsUseCase } from '../../src/usecases/ops/ReconcileOrphanedSubscriptionsUseCase';

function maskEmail(email: string | null): string {
  if (email == null || email.length === 0) return '<none>';
  const [local, domain] = email.split('@');
  if (domain == null) return '<malformed>';
  const head = local.slice(0, 2);
  return `${head}***@${domain}`;
}

async function confirmApply(found: number): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const answer = await new Promise<string>((resolve) => {
    rl.question(
      `About to send recovery emails to up to ${found} orphaned subscribers ` +
        `(14-day cooldown still applies). Type "send recovery emails" to continue: `,
      resolve
    );
  });
  rl.close();
  return answer.trim() === 'send recovery emails';
}

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply');
  const database = getDatabase();

  const listUseCase = new GetOrphanedSubscriptionsUseCase(
    new OrphanedSubscriptionsRepository(database)
  );
  const orphans = await listUseCase.execute();

  console.log(`\nOrphaned active subscriptions: ${orphans.length}\n`);
  for (const orphan of orphans) {
    const created =
      orphan.createdAt == null
        ? 'unknown'
        : new Date(orphan.createdAt).toISOString().slice(0, 10);
    console.log(
      `  ${created}  ${maskEmail(orphan.email)}  ` +
        `product=${orphan.stripeProductId ?? 'none'}  ` +
        `customer=${orphan.customerId ?? 'none'}`
    );
  }

  if (!apply) {
    console.log(
      '\nDry run — no emails sent. Re-run with --apply to send recovery emails.\n'
    );
    await database.destroy();
    return;
  }

  const confirmed = await confirmApply(orphans.length);
  if (!confirmed) {
    console.log('Aborted — no emails sent.');
    await database.destroy();
    return;
  }

  const reconcileUseCase = new ReconcileOrphanedSubscriptionsUseCase(
    new OrphanedSubscriptionsRepository(database),
    new SubscriptionRecoveryNotificationsRepository(database),
    getDefaultEmailService(),
    async (customerId: string) => {
      const customer = await getStripe().customers.retrieve(customerId);
      return 'email' in customer ? (customer.email ?? null) : null;
    }
  );

  const result = await reconcileUseCase.execute();
  console.log('\nReconcile result:');
  console.log(`  found:                  ${result.found}`);
  console.log(`  emailed:                ${result.emailed}`);
  console.log(`  skipped (recent email): ${result.skippedRecentlyNotified}`);
  console.log(`  skipped (no email):     ${result.skippedNoEmail}\n`);

  await database.destroy();
}

main().catch((error) => {
  console.error('[reconcile-orphaned-subscriptions] failed:', error);
  process.exitCode = 1;
});
