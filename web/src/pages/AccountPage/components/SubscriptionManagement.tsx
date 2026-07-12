import React, { ChangeEvent, useEffect, useState } from 'react';
import { useEmailLinking } from '../hooks/useEmailLinking';
import { useSubscriptionCancellation } from '../hooks/useSubscriptionCancellation';
import { usePerSubscriptionCancellation } from '../hooks/usePerSubscriptionCancellation';
import { usePauseSubscription } from '../hooks/usePauseSubscription';
import { useStripeSubscriptions } from '../../../lib/hooks/useStripeSubscriptions';
import { StripeSubscriptionSummary } from '../../../lib/backend/getSubscriptionStatus';
import { track } from '../../../lib/analytics/track';
import { CancelFlow } from './CancelFlow';
import { CancellationReason } from './CancellationFollowUp';
import styles from '../AccountPage.module.css';
import sharedStyles from '../../../styles/shared.module.css';

type CancellationReasonInput = CancellationReason | '';

const SECONDS_PER_DAY = 24 * 60 * 60;
const MIN_TENURE_DAYS_TO_PAUSE = 30;

const tenureDaysOf = (sub: StripeSubscriptionSummary): number => {
  if (sub.created == null) return 0;
  return Math.floor((Date.now() / 1000 - sub.created) / SECONDS_PER_DAY);
};

const isAnnual = (sub: StripeSubscriptionSummary): boolean =>
  sub.plan?.interval === 'year';

interface User {
  email: string;
  name?: string;
}

interface LocalsData {
  subscriber?: boolean;
  planSource?: 'stripe' | 'apple' | 'lifetime' | null;
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

const V2_MONTHLY_AMOUNT = 799;
const V2_YEARLY_AMOUNT = 6400;

const isLegacyRate = (sub: StripeSubscriptionSummary): boolean => {
  const plan = sub.plan;
  if (plan?.amount == null) return false;
  const v2Amount =
    plan.interval === 'year' ? V2_YEARLY_AMOUNT : V2_MONTHLY_AMOUNT;
  return plan.amount < v2Amount;
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

const byNextChargeAsc = (
  a: StripeSubscriptionSummary,
  b: StripeSubscriptionSummary
): number => (a.current_period_end ?? 0) - (b.current_period_end ?? 0);

function MultipleSubscriptionsRow({
  sub,
  confirmingSubId,
  errorSubId,
  cancelError,
  isCancelling,
  onOpenConfirm,
  onConfirmCancel,
  onDismiss,
}: {
  readonly sub: StripeSubscriptionSummary;
  readonly confirmingSubId: string | null;
  readonly errorSubId: string | null;
  readonly cancelError: string;
  readonly isCancelling: boolean;
  readonly onOpenConfirm: (id: string) => void;
  readonly onConfirmCancel: (id: string) => void;
  readonly onDismiss: () => void;
}) {
  const planLabel = formatPlan(sub);
  const isScheduled = sub.cancel_at_period_end;
  const isConfirming = confirmingSubId === sub.id;

  if (isScheduled) {
    return (
      <div className={styles.section}>
        <p className={styles.statusLine}>
          {planLabel ?? 'Premium'} · Ends{' '}
          <strong>{formatDate(sub.cancel_at)}</strong>. Access continues until
          then.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.section}>
      <p className={styles.statusLine}>
        <span style={{ fontWeight: 500 }}>{planLabel ?? 'Premium'}</span> ·
        Renews <strong>{formatDate(sub.current_period_end)}</strong>
      </p>
      {!isConfirming && (
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => onOpenConfirm(sub.id)}
          >
            Cancel this plan
          </button>
        </div>
      )}
      {isConfirming && (
        <div
          className={styles.dangerSection}
          role="group"
          aria-label="Cancel this plan now"
        >
          <p className={styles.dangerTitle}>Cancel this plan now</p>
          <p className={styles.dangerNotice}>
            {planLabel
              ? `Cancels the ${planLabel} plan right away. Your card won't be charged the ${planLabel} due ${formatDate(sub.current_period_end)}. This can't be undone.`
              : "Cancels this plan right away. This can't be undone."}
          </p>
          <div className={styles.buttonRow}>
            <button
              type="button"
              className={styles.dangerButton}
              onClick={() => onConfirmCancel(sub.id)}
              disabled={isCancelling}
            >
              {isCancelling ? 'Processing…' : 'Cancel this plan'}
            </button>
            <button
              type="button"
              className={styles.textButton}
              onClick={onDismiss}
              disabled={isCancelling}
            >
              Keep it
            </button>
          </div>
        </div>
      )}
      {errorSubId === sub.id && cancelError && (
        <p className={styles.helpDanger}>{cancelError}</p>
      )}
    </div>
  );
}

function MultipleSubscriptions({
  subscriptions,
  onRefetch,
}: {
  readonly subscriptions: StripeSubscriptionSummary[];
  readonly onRefetch: () => Promise<unknown>;
}) {
  const {
    confirmingSubId,
    errorSubId,
    cancelError,
    isCancelling,
    openConfirm,
    dismissConfirm,
    confirmCancel,
  } = usePerSubscriptionCancellation(() => {
    void onRefetch();
  });

  const ordered = [...subscriptions].sort(byNextChargeAsc);

  return (
    <section className={styles.section}>
      <p className={styles.scheduledBadge}>
        You have {subscriptions.length} active subscriptions. You're likely
        being charged twice — cancel the one you don't want to keep.
      </p>
      {ordered.map((sub) => (
        <MultipleSubscriptionsRow
          key={sub.id}
          sub={sub}
          confirmingSubId={confirmingSubId}
          errorSubId={errorSubId}
          cancelError={cancelError}
          isCancelling={isCancelling}
          onOpenConfirm={openConfirm}
          onConfirmCancel={confirmCancel}
          onDismiss={dismissConfirm}
        />
      ))}
    </section>
  );
}

function AppleSubscriptionManagement() {
  return (
    <section className={styles.section}>
      <p className={styles.statusLine}>Unlimited · Billed through Apple</p>
      <p className={sharedStyles.smallDescription}>
        Manage or cancel this subscription in your Apple Account settings: open
        Settings on your iPhone or iPad, tap your name, then Subscriptions.
      </p>
    </section>
  );
}

function LifetimeSubscriptionManagement() {
  return (
    <section className={styles.section}>
      <p className={styles.statusLine}>Lifetime access</p>
      <p className={sharedStyles.smallDescription}>No renewal, no billing.</p>
    </section>
  );
}

function PausedState({
  subscription,
  planLabel,
  isResuming,
  isCancelling,
  resumeError,
  onResume,
  onCancel,
}: {
  readonly subscription: StripeSubscriptionSummary;
  readonly planLabel: string | null;
  readonly isResuming: boolean;
  readonly isCancelling: boolean;
  readonly resumeError: string;
  readonly onResume: () => void;
  readonly onCancel: () => void;
}) {
  const resumeDate = formatDate(subscription.paused_until);
  const planText = planLabel ?? 'your plan';

  return (
    <>
      <p className={styles.scheduledBadge}>
        Paused · Resumes <strong>{resumeDate}</strong>
      </p>
      <p className={styles.dangerNotice}>
        You won't be charged while paused. Your subscription resumes on{' '}
        {resumeDate} at {planText}. While paused, paid features are off and
        everything you've made is saved.
      </p>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.primaryButton}
          onClick={onResume}
          disabled={isResuming}
        >
          {isResuming ? 'Resuming…' : 'Resume now'}
        </button>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={onCancel}
          disabled={isCancelling}
        >
          {isCancelling ? 'Processing…' : 'Cancel subscription'}
        </button>
      </div>
      {resumeError && <p className={styles.helpDanger}>{resumeError}</p>}
    </>
  );
}

export function SubscriptionManagement(props: SubscriptionManagementProps) {
  const { locals, hasActivePlan } = props;

  if (!hasActivePlan) {
    return null;
  }

  if (locals.planSource === 'apple') {
    return <AppleSubscriptionManagement />;
  }

  if (locals.planSource === 'lifetime') {
    return <LifetimeSubscriptionManagement />;
  }

  return <StripeSubscriptionManagement {...props} />;
}

function StripeSubscriptionManagement({
  user,
  locals,
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
    submitFeedback,
    isCancelling,
    cancelError,
    cancelSuccess,
  } = useSubscriptionCancellation(refetchAll);

  const {
    pauseSubscriptionForMonths,
    resumeSubscriptionNow,
    isPausing,
    isResuming,
    pauseError,
    resumeError,
  } = usePauseSubscription(refetchAll);

  const [confirming, setConfirming] = useState(false);

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

  const { view, activeSubscriptions } = stripeStatus;
  const hasMultipleActive = activeSubscriptions.length > 1;

  const activeSub = view.kind === 'active' ? view.subscription : null;
  const pauseEligible =
    activeSub != null &&
    !isAnnual(activeSub) &&
    tenureDaysOf(activeSub) >= MIN_TENURE_DAYS_TO_PAUSE &&
    !hasMultipleActive;

  const handleCancelFromFlow = (reason: CancellationReasonInput) => {
    if (reason) {
      submitFeedback(reason, '');
    }
    cancelUserSubscription('period_end', activeSub?.current_period_end);
    setConfirming(false);
  };

  const handleKeep = (reason: CancellationReasonInput) => {
    if (reason) {
      submitFeedback(reason, '');
    }
    setConfirming(false);
  };

  const handleCancelDuringPause = () => {
    track('subscription_cancelled_during_pause');
    cancelUserSubscription('immediate');
  };

  return (
    <section className={styles.section}>
      {hasMultipleActive && (
        <MultipleSubscriptions
          subscriptions={activeSubscriptions}
          onRefetch={refetchAll}
        />
      )}

      {!hasMultipleActive && locals?.subscriber && (
        <div>
          {view.kind === 'active' && (
            <>
              <p className={styles.statusLine}>
                {formatPlan(view.subscription) ?? 'Premium'} · Renews{' '}
                <strong>
                  {formatDate(view.subscription.current_period_end)}
                </strong>
              </p>
              {isLegacyRate(view.subscription) && (
                <p className={styles.legacyNote}>
                  Cancelling forfeits this legacy rate.
                </p>
              )}
              {!confirming && (
                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => setConfirming(true)}
                    disabled={isCancelling}
                  >
                    Cancel subscription
                  </button>
                </div>
              )}
              {confirming && (
                <CancelFlow
                  planLabel={formatPlan(view.subscription)}
                  tenureDays={tenureDaysOf(view.subscription)}
                  pauseEligible={pauseEligible}
                  isCancelling={isCancelling}
                  isPausing={isPausing}
                  pauseError={pauseError}
                  onCancel={handleCancelFromFlow}
                  onKeep={handleKeep}
                  onPause={(months) => pauseSubscriptionForMonths(months)}
                />
              )}
            </>
          )}

          {view.kind === 'paused' && (
            <PausedState
              subscription={view.subscription}
              planLabel={formatPlan(view.subscription)}
              isResuming={isResuming}
              isCancelling={isCancelling}
              resumeError={resumeError}
              onResume={resumeSubscriptionNow}
              onCancel={handleCancelDuringPause}
            />
          )}

          {view.kind === 'scheduled' && (
            <>
              <p className={styles.statusLine}>
                Ends <strong>{formatDate(view.subscription.cancel_at)}</strong>.
                Access continues until then.
              </p>
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.textButton}
                  onClick={() => cancelUserSubscription('immediate')}
                  disabled={isCancelling}
                >
                  {isCancelling ? 'Processing…' : 'Cancel now instead'}
                </button>
              </div>
            </>
          )}

          {view.kind === 'cancelled' && (
            <p className={styles.statusLineMuted}>
              Ended <strong>{formatDate(view.subscription.canceled_at)}</strong>
              .
              {formatPlan(view.subscription) &&
                ` Previous plan: ${formatPlan(view.subscription)}.`}
            </p>
          )}

          {stripeStatus.isLoading && view.kind === 'none' && (
            <p className={sharedStyles.smallDescription}>
              Reading your subscription
            </p>
          )}

          {cancelError && <p className={styles.helpDanger}>{cancelError}</p>}
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
                {isLinking ? 'Linking…' : 'Link email'}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
