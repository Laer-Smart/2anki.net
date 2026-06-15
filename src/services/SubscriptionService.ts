import type { Stripe as StripeTypes } from 'stripe/cjs/stripe.core';
import { getDatabase } from '../data_layer';
import { getStripe } from '../lib/integrations/stripe';
import { getDefaultEmailService } from './EmailService/EmailService';
import Subscriptions from '../data_layer/public/Subscriptions';

export type CancelMode = 'immediate' | 'period_end';

export class SubscriptionNotOwnedError extends Error {
  constructor() {
    super('Subscription not found');
    this.name = 'SubscriptionNotOwnedError';
  }
}

async function collectCandidateEmails(userEmail: string): Promise<string[]> {
  const normalized = userEmail.toLowerCase();
  const db = getDatabase();
  const linked: Array<{ email: string }> = await db('subscriptions')
    .select('email')
    .where({ linked_email: normalized });

  const emails = new Set<string>([normalized]);
  for (const row of linked) {
    if (row.email) {
      emails.add(row.email.toLowerCase());
    }
  }
  return [...emails];
}

async function listStripeSubscriptionsFor(
  userEmail: string,
  status: StripeTypes.SubscriptionListParams['status']
): Promise<StripeTypes.Subscription[]> {
  const stripe = getStripe();
  const candidateEmails = await collectCandidateEmails(userEmail);

  const seen = new Set<string>();
  const subs: StripeTypes.Subscription[] = [];

  for (const email of candidateEmails) {
    const customers = await stripe.customers.list({ email, limit: 10 });
    for (const customer of customers.data) {
      const list = await stripe.subscriptions.list({
        customer: customer.id,
        status,
        limit: 10,
      });
      for (const sub of list.data) {
        if (!seen.has(sub.id)) {
          seen.add(sub.id);
          subs.push(sub);
        }
      }
    }
  }

  return subs;
}

export class SubscriptionService {
  static findActiveStripeSubscriptions(
    userEmail: string
  ): Promise<StripeTypes.Subscription[]> {
    return listStripeSubscriptionsFor(userEmail, 'active');
  }

  static findRecentStripeSubscriptions(
    userEmail: string
  ): Promise<StripeTypes.Subscription[]> {
    return listStripeSubscriptionsFor(userEmail, 'all');
  }

  static async cancelUserSubscriptions(
    userEmail: string,
    mode: CancelMode = 'period_end',
    allStatuses = false,
    sendEmail = true
  ): Promise<number> {
    const stripe = getStripe();
    const emailService = getDefaultEmailService();
    const allSubs = allStatuses
      ? await this.findRecentStripeSubscriptions(userEmail)
      : await this.findActiveStripeSubscriptions(userEmail);
    const subs = allStatuses
      ? allSubs.filter((s) => s.status !== 'canceled')
      : allSubs;

    console.log(
      `Found ${subs.length} active Stripe subscription(s) to process`
    );

    for (const sub of subs) {
      if (mode === 'immediate') {
        console.log(`Cancelling Stripe subscription ${sub.id} immediately`);
        await stripe.subscriptions.cancel(sub.id);
        if (sendEmail) {
          await emailService.sendSubscriptionCancelledEmail(
            userEmail,
            '',
            sub.id
          );
        }
      } else {
        console.log(
          `Scheduling cancellation at period end for Stripe subscription ${sub.id}`
        );
        const updated = await stripe.subscriptions.update(sub.id, {
          cancel_at_period_end: true,
        });
        const cancelAt = updated.cancel_at ?? sub.cancel_at;
        if (sendEmail && cancelAt) {
          await emailService.sendSubscriptionScheduledCancellationEmail(
            userEmail,
            '',
            new Date(cancelAt * 1000)
          );
        }
      }
    }

    if (mode === 'immediate' && subs.length > 0) {
      const normalized = userEmail.toLowerCase();
      const db = getDatabase();
      await db('subscriptions')
        .where(function () {
          this.where({ email: normalized }).orWhere({
            linked_email: normalized,
          });
        })
        .delete();
    }

    return subs.length;
  }

  static async cancelSubscriptionById(
    callerEmail: string,
    id: string,
    mode: CancelMode
  ): Promise<void> {
    const owned = await this.findRecentStripeSubscriptions(callerEmail);
    const isOwned = owned.some((sub) => sub.id === id);
    if (!isOwned) {
      throw new SubscriptionNotOwnedError();
    }

    const stripe = getStripe();

    if (mode === 'immediate') {
      await stripe.subscriptions.cancel(id);
      const db = getDatabase();
      await db('subscriptions').whereRaw("payload->>'id' = ?", [id]).delete();
    } else {
      await stripe.subscriptions.update(id, { cancel_at_period_end: true });
    }

    console.log('subscription_self_serve_extra_cancel');
  }

  static async getUserActiveSubscriptions(
    userEmail: string
  ): Promise<Subscriptions[]> {
    const database = getDatabase();

    return database('subscriptions')
      .where(function () {
        this.where({ email: userEmail.toLowerCase() }).orWhere({
          linked_email: userEmail.toLowerCase(),
        });
      })
      .andWhere({ active: true });
  }

  static async countActiveByProductId(productId: string): Promise<number> {
    const database = getDatabase();
    const rows = await database('subscriptions')
      .where({ active: true, stripe_product_id: productId })
      .count<[{ count: string }]>('id as count');
    return Number.parseInt(rows[0]?.count ?? '0', 10);
  }

  async deactivateSubscription(subscriptionId: number): Promise<void> {
    const database = getDatabase();

    await database('subscriptions')
      .where({ id: subscriptionId })
      .update({ active: false });
  }
}

export default SubscriptionService;
