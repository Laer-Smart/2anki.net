import { getStripe, extractProductId } from '../../../integrations/stripe';
import { getDatabase } from '../../../../data_layer';
import { Knex } from 'knex';
import type { Stripe as StripeTypes } from 'stripe/cjs/stripe.core';
import { reconcileActiveSubscriptions } from './reconcileActiveSubscriptions';
import { withStripeRetry } from './withStripeRetry';

const stripe = getStripe();
const database = getDatabase();

/**
 * Fetches a batch of active subscriptions from Stripe
 */
function fetchSubscriptionBatch(startingAfter?: string) {
  return withStripeRetry(
    () => stripe.subscriptions.list({ limit: 100, status: 'active', starting_after: startingAfter }),
    'fetchSubscriptionBatch'
  );
}

/**
 * Retrieves customer information from Stripe
 */
async function getCustomer(
  customerId: string
): Promise<StripeTypes.Customer | null> {
  try {
    const customer = await withStripeRetry(
      () => stripe.customers.retrieve(customerId),
      'getCustomer'
    );
    if ('email' in customer && customer.email) {
      return customer as StripeTypes.Customer;
    }
    console.warn('Customer does not have an email', customerId);
    return null;
  } catch (error) {
    console.error('Error retrieving customer', customerId, error);
    return null;
  }
}

/**
 * Updates or creates a subscription record in the database
 */
/**
 * Determines if a subscription should be considered active based on its status and cancellation schedule
 */
function determineSubscriptionActiveStatus(
  subscription: StripeTypes.Subscription,
  email: string
): boolean {
  const isActive = subscription.status === 'active';
  const isCancelScheduled = subscription.cancel_at_period_end === true;

  // If not active or not scheduled for cancellation, just return the active status
  if (!isActive || !isCancelScheduled) {
    return isActive;
  }

  // For subscriptions scheduled for cancellation, check if we're still in the paid period
  const periodEndDate = new Date((subscription.cancel_at ?? 0) * 1000);
  const currentDate = new Date();
  const shouldRemainActive = currentDate < periodEndDate;

  if (shouldRemainActive) {
    console.info(
      `Subscription for ${email} is scheduled for cancellation but still active until ${periodEndDate.toISOString()}`
    );
  }

  return shouldRemainActive;
}

/**
 * Updates an existing subscription record in the database
 */
async function updateExistingSubscription(
  db: Knex,
  email: string,
  subscription: StripeTypes.Subscription,
  shouldRemainActive: boolean,
  existingActive: boolean
): Promise<void> {
  const statusChanged = existingActive !== shouldRemainActive;
  const payload = JSON.stringify(subscription);
  const stripeProductId = extractProductId(subscription);

  if (statusChanged) {
    console.info(
      `Updating subscription status for ${email} to ${shouldRemainActive ? 'active' : 'inactive'}`
    );
    await db
      .table('subscriptions')
      .where({ email })
      .update({ active: shouldRemainActive, payload, stripe_product_id: stripeProductId });
  } else {
    console.info(
      `Subscription status for ${email} remains ${shouldRemainActive ? 'active' : 'inactive'}`
    );
    await db.table('subscriptions').where({ email }).update({ payload, stripe_product_id: stripeProductId });
  }
}

/**
 * Creates a new subscription record in the database
 */
async function createNewSubscription(
  db: Knex,
  email: string,
  customerId: string,
  subscription: StripeTypes.Subscription,
  shouldRemainActive: boolean
): Promise<void> {
  console.info(
    `Creating subscription for customer ${customerId}, ${email}, active: ${shouldRemainActive}`
  );
  await db.table('subscriptions').insert({
    email,
    active: shouldRemainActive,
    payload: JSON.stringify(subscription),
    stripe_product_id: extractProductId(subscription),
  });
}

/**
 * Updates or creates a subscription record in the database
 */
async function updateSubscriptionRecord(
  db: Knex,
  customer: StripeTypes.Customer,
  subscription: StripeTypes.Subscription
): Promise<void> {
  const email = customer.email!.toLowerCase();

  try {
    const shouldRemainActive = determineSubscriptionActiveStatus(
      subscription,
      email
    );
    const existingSubscription = await db
      .table('subscriptions')
      .where({ email })
      .first();

    if (existingSubscription) {
      await updateExistingSubscription(
        db,
        email,
        subscription,
        shouldRemainActive,
        existingSubscription.active
      );
    } else {
      await createNewSubscription(
        db,
        email,
        customer.id,
        subscription,
        shouldRemainActive
      );
    }

    await db
      .table('users')
      .where({ email })
      .update({ stripe_customer_id: customer.id });
  } catch (error) {
    console.error(
      'Error updating subscription record',
      customer.id,
      email,
      error
    );
    throw error;
  }
}

/**
 * Processes a single subscription
 */
async function processSubscription(
  db: Knex,
  subscription: StripeTypes.Subscription
): Promise<void> {
  try {
    if (typeof subscription.customer !== 'string') {
      console.warn('Subscription has non-string customer ID', subscription.id);
      return;
    }

    const customer = await getCustomer(subscription.customer);
    if (!customer) return;

    await updateSubscriptionRecord(db, customer, subscription);
  } catch (error) {
    console.error('Error processing subscription', subscription.id, error);
    // We don't rethrow here to allow processing of other subscriptions
  }
}

/**
 * Updates the pagination parameters based on the subscription batch
 */
function updatePaginationParams(
  subscriptions: StripeTypes.ApiList<StripeTypes.Subscription>
): {
  hasMore: boolean;
  startingAfter?: string;
} {
  const hasMore = subscriptions.has_more;
  let startingAfter: string | undefined = undefined;

  if (hasMore && subscriptions.data.length > 0) {
    startingAfter = subscriptions.data[subscriptions.data.length - 1].id;
    console.info(
      `More subscriptions available, next starting point: ${startingAfter}`
    );
  } else {
    console.info('No more subscriptions to fetch');
  }

  return { hasMore, startingAfter };
}

/**
 * Main function to synchronize Stripe subscriptions with the database
 */
async function updateStripeSubscriptions(): Promise<void> {
  let hasMore = true;
  let startingAfter: string | undefined = undefined;

  console.info('Starting subscription sync with Stripe');

  try {
    while (hasMore) {
      console.info(
        `Fetching subscriptions${startingAfter ? ' after ' + startingAfter : ''}`
      );

      const subscriptions = await fetchSubscriptionBatch(startingAfter);
      console.info(`Processing ${subscriptions.data.length} subscriptions`);

      // If no subscriptions were returned, exit the loop
      if (subscriptions.data.length === 0) {
        console.info('No more subscriptions to process');
        break;
      }

      // Process each subscription
      const processPromises = subscriptions.data.map((subscription) =>
        processSubscription(database, subscription)
      );

      // Wait for all subscriptions to be processed
      await Promise.all(processPromises);

      // Update pagination parameters
      const pagination = updatePaginationParams(subscriptions);
      hasMore = pagination.hasMore;
      startingAfter = pagination.startingAfter;
    }

    console.info('Forward sync from Stripe completed successfully');

    await reconcileActiveSubscriptions(database, stripe);
    console.info('Subscription sync completed successfully');
  } catch (error) {
    console.error('Error in updateStripeSubscriptions:', error);
    throw error; // Re-throw to be caught by the caller
  }
}

// Export for testing and importing elsewhere
export { updateStripeSubscriptions };

// Run directly if this file is executed directly
if (require.main === module) {
  updateStripeSubscriptions()
    .catch(console.error)
    .finally(async () => {
      await database.destroy(); // 🔥 properly close DB connection
    });
}
