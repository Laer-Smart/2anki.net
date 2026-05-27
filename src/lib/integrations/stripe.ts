import Stripe from 'stripe';
import type { Stripe as StripeTypes } from 'stripe/cjs/stripe.core';
import { Knex } from 'knex';

let stripeInstance: InstanceType<typeof Stripe> | null = null;

export const getStripe = () => {
  if (stripeInstance == null) {
    stripeInstance = new Stripe(process.env.STRIPE_KEY!);
  }
  return stripeInstance;
};

export const getCustomerId = (
  customer: string | StripeTypes.Customer | StripeTypes.DeletedCustomer | null
) => {
  if (typeof customer === 'string') {
    return customer;
  }
  return customer?.id;
};

export const extractProductId = (
  subscription: StripeTypes.Subscription
): string | null => {
  const product = subscription.items?.data?.[0]?.price?.product;
  if (product == null) {
    return null;
  }
  if (typeof product === 'string') {
    return product;
  }
  return product.id;
};

export const updateStoreSubscription = async (
  db: Knex,
  customer: StripeTypes.Customer,
  subscription: StripeTypes.Subscription
) => {
  const email = customer.email;
  const isActive = subscription.status === 'active';
  const isCancelScheduled = subscription.cancel_at_period_end === true;

  let shouldRemainActive = isActive;
  if (isActive && isCancelScheduled) {
    const periodEndDate = new Date((subscription.cancel_at ?? 0) * 1000);
    const currentDate = new Date();
    shouldRemainActive = currentDate < periodEndDate;
  }

  const stripeProductId = extractProductId(subscription);

  const customerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer?.id ?? null;

  await db('subscriptions')
    .insert({
      email: email?.toLowerCase(),
      active: shouldRemainActive,
      payload: JSON.stringify(subscription),
      stripe_product_id: stripeProductId,
    })
    .onConflict('email')
    .merge(['active', 'payload', 'stripe_product_id']);

  if (email != null && customerId != null) {
    await db('users')
      .where({ email: email.toLowerCase() })
      .update({ stripe_customer_id: customerId });
  }
};
