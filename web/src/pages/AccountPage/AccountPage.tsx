import { useSearchParams } from 'react-router-dom';
import { useUserLocals } from '../../lib/hooks/useUserLocals';
import { SkeletonPage } from '../../components/Skeleton/Skeleton';
import { useSubscriptionStatus } from './hooks';
import {
  UserProfile,
  PlanDetails,
  ClaimSubscription,
  SubscriptionManagement,
  AccountDeletion,
  AutoSyncBanner,
} from './components';
import sharedStyles from '../../styles/shared.module.css';
import styles from './AccountPage.module.css';

export default function AccountPage() {
  const { isLoading, data, refetch } = useUserLocals();
  const { subscriptionType, hasActivePlan } = useSubscriptionStatus(
    data?.locals
  );
  const [searchParams, setSearchParams] = useSearchParams();
  const justSubscribed = searchParams.get('subscribed') === '1';
  const justVerified = searchParams.get('verified') === '1';

  const dismissParam = (key: string) => {
    const next = new URLSearchParams(searchParams);
    next.delete(key);
    setSearchParams(next, { replace: true });
  };

  if (isLoading) return <SkeletonPage rows={4} />;

  if (!data?.user?.email) {
    globalThis.location.href = '/login';
    return null;
  }

  const { user, locals } = data;

  return (
    <div className={styles.page}>
      <header className={sharedStyles.pageHeader}>
        <h1 className={sharedStyles.title}>Account</h1>
      </header>

      {justSubscribed && (
        <div
          className={sharedStyles.alertSuccess}
          role="status"
          aria-live="polite"
        >
          <p>
            <strong>Subscribed.</strong>
          </p>
          <button
            type="button"
            className={sharedStyles.btnGhost}
            onClick={() => dismissParam('subscribed')}
          >
            Dismiss
          </button>
        </div>
      )}

      {justVerified && (
        <div
          className={sharedStyles.alertSuccess}
          role="status"
          aria-live="polite"
        >
          <p>Email verified.</p>
          <button
            type="button"
            className={sharedStyles.btnGhost}
            onClick={() => dismissParam('verified')}
          >
            Dismiss
          </button>
        </div>
      )}

      <UserProfile user={user} />

      <PlanDetails subscriptionType={subscriptionType} />

      <AutoSyncBanner />

      <ClaimSubscription />

      <SubscriptionManagement
        user={user}
        locals={locals}
        hasActivePlan={hasActivePlan}
        onRefetch={refetch}
      />

      <AccountDeletion />

      <footer className={styles.pageFooter}>
        <a href="mailto:support@2anki.net" className={styles.footerLink}>
          support@2anki.net
        </a>
      </footer>
    </div>
  );
}
