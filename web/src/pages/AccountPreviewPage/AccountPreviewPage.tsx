import { ReactElement } from 'react';
import sharedStyles from '../../styles/shared.module.css';
import accountStyles from '../AccountPage/AccountPage.module.css';
import {
  UserProfile,
  PlanDetails,
  AccountDeletion,
} from '../AccountPage/components';
import previewStyles from './AccountPreviewPage.module.css';

interface Variant {
  label: string;
  note: string;
  render: () => ReactElement;
}

const variants: Variant[] = [
  {
    label: 'Free — regular email',
    note: 'New signup via email or Google.',
    render: () => (
      <>
        <UserProfile user={{ name: 'Alex Newcomer', email: 'alex@example.com' }} />
        <PlanDetails subscriptionType="free" />
        <AccountDeletion />
      </>
    ),
  },
  {
    label: 'Free — Apple Hide My Email',
    note: 'Signed up with Sign in with Apple and chose Hide My Email.',
    render: () => (
      <>
        <UserProfile
          user={{
            name: 'Alexander Alemayhu',
            email: 'j6y7w6md9k@privaterelay.appleid.com',
          }}
        />
        <PlanDetails subscriptionType="free" />
        <AccountDeletion />
      </>
    ),
  },
  {
    label: 'Pro subscriber — active',
    note: 'Active monthly subscription.',
    render: () => (
      <>
        <UserProfile user={{ name: 'Casey Pro', email: 'casey@example.com' }} />
        <PlanDetails subscriptionType="subscriber" />
        <section className={accountStyles.section}>
          <div className={accountStyles.activeBadge}>
            Active — renews on <strong>15 June 2026</strong>.
            <p className={accountStyles.planDetail}>$6.00 / month</p>
          </div>
          <div className={accountStyles.buttonRow}>
            <button type="button" className={accountStyles.dangerButton}>
              Cancel at end of billing period
            </button>
            <button type="button" className={accountStyles.dangerButton}>
              Cancel immediately
            </button>
          </div>
        </section>
        <AccountDeletion />
      </>
    ),
  },
  {
    label: 'Pro subscriber — legacy $2/mo',
    note: 'Active on the legacy price; about to be told what they’d lose.',
    render: () => (
      <>
        <UserProfile user={{ name: 'Dani Legacy', email: 'dani@example.com' }} />
        <PlanDetails subscriptionType="subscriber" />
        <section className={accountStyles.section}>
          <div className={accountStyles.activeBadge}>
            Active — renews on <strong>15 June 2026</strong>.
            <p className={accountStyles.planDetail}>$2.00 / month</p>
          </div>
          <div className={accountStyles.infoBadge}>
            You&apos;re on our legacy $2/mo plan. If you cancel, this rate won&apos;t
            be available again — the current price is $6/mo.
          </div>
          <div className={accountStyles.buttonRow}>
            <button type="button" className={accountStyles.dangerButton}>
              Cancel at end of billing period
            </button>
            <button type="button" className={accountStyles.dangerButton}>
              Cancel immediately
            </button>
          </div>
        </section>
        <AccountDeletion />
      </>
    ),
  },
  {
    label: 'Pro subscriber — scheduled to cancel',
    note: 'Has cancelled; still inside the paid window.',
    render: () => (
      <>
        <UserProfile user={{ name: 'Jamie Leaving', email: 'jamie@example.com' }} />
        <PlanDetails subscriptionType="subscriber" />
        <section className={accountStyles.section}>
          <div className={accountStyles.scheduledBadge}>
            Scheduled to cancel on <strong>15 June 2026</strong>. You will keep
            access until then.
            <p className={accountStyles.planDetail}>$6.00 / month</p>
          </div>
          <div className={accountStyles.buttonRow}>
            <button type="button" className={accountStyles.dangerButton}>
              Cancel immediately instead
            </button>
          </div>
        </section>
        <AccountDeletion />
      </>
    ),
  },
  {
    label: 'Cancelled subscriber',
    note: 'Sub already ended; sees what was lost.',
    render: () => (
      <>
        <UserProfile user={{ name: 'Sam Past', email: 'sam@example.com' }} />
        <PlanDetails subscriptionType="free" />
        <section className={accountStyles.section}>
          <div className={accountStyles.cancelledBadge}>
            Cancelled on <strong>1 May 2026</strong>. Your subscription is no
            longer active.
            <p className={accountStyles.planDetail}>
              Previous plan: $6.00 / month
            </p>
          </div>
        </section>
        <AccountDeletion />
      </>
    ),
  },
  {
    label: 'Lifetime',
    note: 'Bought the lifetime plan; nothing to manage.',
    render: () => (
      <>
        <UserProfile user={{ name: 'Robin Forever', email: 'robin@example.com' }} />
        <PlanDetails subscriptionType="lifetime" />
        <AccountDeletion />
      </>
    ),
  },
];

export default function AccountPreviewPage() {
  return (
    <div className={previewStyles.outer}>
      <header className={previewStyles.outerHeader}>
        <h1 className={sharedStyles.title}>Account — variants</h1>
        <p className={sharedStyles.subtitle}>
          Visual preview only. Not linked from navigation. Not gated by auth.
        </p>
      </header>

      <div className={previewStyles.grid}>
        {variants.map((variant) => (
          <article key={variant.label} className={previewStyles.variant}>
            <header className={previewStyles.variantHeader}>
              <h2 className={previewStyles.variantLabel}>{variant.label}</h2>
              <p className={previewStyles.variantNote}>{variant.note}</p>
            </header>
            <div className={previewStyles.frame}>
              <div className={accountStyles.page}>{variant.render()}</div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
