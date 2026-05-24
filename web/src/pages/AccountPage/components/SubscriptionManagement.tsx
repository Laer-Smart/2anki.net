import React, { ChangeEvent, useEffect } from 'react';
import { useEmailLinking } from '../hooks/useEmailLinking';
import { useSubscriptionCancellation } from '../hooks/useSubscriptionCancellation';
import { useStripeSubscriptions } from '../../../lib/hooks/useStripeSubscriptions';
import { StripeSubscriptionSummary } from '../../../lib/backend/getSubscriptionStatus';
import { CancellationSurveyModal } from './CancellationSurveyModal';
import styles from '../AccountPage.module.css';
import sharedStyles from '../../../styles/shared.module.css';

interface User {
  email: string;
  name?: string;
}

interface LocalsData {
  subscriber?: boolean;
  subscriptionInfo?: {
    linked_email?: string;
    email?: string;
  };
}

interface SubscriptionManagementProps {
  readonly user: User;
  readonly locals: LocalsData;
  readonly hasActivePlan: boolean;
  readonly onRefetch: () => Promise<any>;
}

const formatDate = (seconds: number | null): string => {
  if (!seconds) return 'an unknown date';
  return new Date(seconds * 1000).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const formatPlan = (sub: StripeSubscriptionSummary): string | null => {
  const plan = sub.plan;
  if (plan?.amount == null || !plan?.currency) return null;
  const price = (plan.amount / 100).toLocaleString(undefined, {
    style: 'currency',
    currency: plan.currency.toUpperCase(),
  });
  return plan.interval ? `${price} / ${plan.interval}` : price;
};

export function SubscriptionManagement({
  user,
  locals,
  hasActivePlan,
  onRefetch,
}: SubscriptionManagementProps) {
  const {
    linkEmail,
    setLinkEmail,
    linkError,
    linkSuccess,
    isLinking,
    performLinkEmail,
  } = useEmailLinking(onRefetch);

  const stripeStatus = useStripeSubscriptions(Boolean(locals?.subscriber));

  const refetchAll = async () => {
    await Promise.all([onRefetch(), stripeStatus.refetch()]);
  };

  const {
    cancelUserSubscription,
    confirmCancellation,
    dismissSurvey,
    pendingMode,
    isCancelling,
    cancelError,
    cancelSuccess,
  } = useSubscriptionCancellation(refetchAll);

  useEffect(() => {
    if (locals?.subscriptionInfo?.linked_email) {
      setLinkEmail(locals.subscriptionInfo.linked_email);
    }
  }, [locals?.subscriptionInfo?.linked_email, setLinkEmail]);

  const onChangeLinkEmail = (event: ChangeEvent<HTMLInputElement>) => {
    setLinkEmail(event.target.value);
  };

  const onLink = () => {
    performLinkEmail(linkEmail);
  };

  const isEmailLinked =
    locals?.subscriptionInfo?.linked_email === user.email ||
    locals?.subscriptionInfo?.email === user.email;

  if (!locals?.subscriber) {
    return null;
  }

  const { view } = stripeStatus;

  return (
    <>
    {pendingMode && (
      <CancellationSurveyModal
        mode={pendingMode}
        onConfirm={confirmCancellation}
        onClose={dismissSurvey}
      />
    )}
    <section className={styles.section}>
      {locals?.subscriber && (
        <div className={sharedStyles.marginBottomMd}>
          {view.kind === 'active' && (
            <div className={styles.activeBadge}>
              Active — renews on{' '}
              <strong>{formatDate(view.subscription.current_period_end)}</strong>
              .
              {formatPlan(view.subscription) && (
                <p className={styles.planDetail}>
                  {formatPlan(view.subscription)}
                </p>
              )}
            </div>
          )}

          {view.kind === 'scheduled' && (
            <div className={styles.scheduledBadge}>
              Scheduled to cancel on{' '}
              <strong>{formatDate(view.subscription.cancel_at)}</strong>
              . You will keep access until then.
              {formatPlan(view.subscription) && (
                <p className={styles.planDetail}>
                  {formatPlan(view.subscription)}
                </p>
              )}
            </div>
          )}

          {view.kind === 'cancelled' && (
            <div className={styles.cancelledBadge}>
              Cancelled on{' '}
              <strong>{formatDate(view.subscription.canceled_at)}</strong>. Your
              subscription is no longer active.
              {formatPlan(view.subscription) && (
                <p className={styles.planDetail}>
                  Previous plan: {formatPlan(view.subscription)}
                </p>
              )}
            </div>
          )}

          {stripeStatus.isLoading && view.kind === 'none' && (
            <p className={sharedStyles.smallDescription}>
              Loading subscription status…
            </p>
          )}

          {view.kind === 'active' &&
            view.subscription.plan?.amount != null &&
            view.subscription.plan.amount < 600 && (
              <div className={styles.infoBadge}>
                You're on our legacy $2/mo plan. If you cancel, this rate won't
                be available again — the current price is $6/mo.
              </div>
            )}

          <div className={styles.buttonRow}>
            {view.kind === 'active' && (
              <>
                <button
                  type="button"
                  className={styles.dangerButton}
                  onClick={() => cancelUserSubscription('period_end')}
                  disabled={isCancelling}
                >
                  {isCancelling
                    ? 'Processing…'
                    : 'Cancel at end of billing period'}
                </button>
                <button
                  type="button"
                  className={styles.dangerButton}
                  onClick={() => cancelUserSubscription('immediate')}
                  disabled={isCancelling}
                >
                  {isCancelling ? 'Processing…' : 'Cancel immediately'}
                </button>
              </>
            )}
            {view.kind === 'scheduled' && (
              <button
                type="button"
                className={styles.dangerButton}
                onClick={() => cancelUserSubscription('immediate')}
                disabled={isCancelling}
              >
                {isCancelling ? 'Processing…' : 'Cancel immediately instead'}
              </button>
            )}
          </div>

          {cancelError && (
            <p className={styles.helpDanger}>{cancelError}</p>
          )}
          {cancelSuccess && (
            <p className={styles.helpSuccess}>{cancelSuccess}</p>
          )}
        </div>
      )}

      {locals?.subscriber && (
        <div className={sharedStyles.marginTopLg}>
          <h4 className={sharedStyles.smallHeading}>Linked 2anki.net email</h4>
          {isEmailLinked ? (
            <div className={styles.linkedEmail}>
              <p>
                Your subscription is managed through your Stripe account at{' '}
                <strong>{locals.subscriptionInfo?.email}</strong>. You can:
              </p>
              <ul className={sharedStyles.featureList}>
                <li>Manage your subscription</li>
                <li>Update payment details</li>
                <li>Cancel your subscription</li>
              </ul>
            </div>
          ) : (
            <div>
              <div className={styles.field}>
                <label htmlFor="subscription-email">Subscription email</label>
                <input
                  id="subscription-email"
                  value={linkEmail}
                  onChange={onChangeLinkEmail}
                  type="email"
                  placeholder="Enter subscription email"
                  disabled={isEmailLinked}
                />
                {linkError && <p className={styles.helpDanger}>{linkError}</p>}
                {linkSuccess && (
                  <p className={styles.helpSuccess}>Email linked.</p>
                )}
              </div>

              <button
                type="button"
                className={styles.planButton}
                onClick={onLink}
                disabled={isEmailLinked || !linkEmail.trim()}
              >
                {isLinking ? 'Linking' : 'Link email'}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
    </>
  );
}
