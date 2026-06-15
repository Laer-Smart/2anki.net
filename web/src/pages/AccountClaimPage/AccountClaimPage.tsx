import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { post } from '../../lib/backend/api';
import { SkeletonPage } from '../../components/Skeleton/Skeleton';
import sharedStyles from '../../styles/shared.module.css';

type State =
  | 'loading'
  | 'success'
  | 'expired'
  | 'already_claimed'
  | 'active_sub'
  | 'unauthenticated'
  | 'error';

export default function AccountClaimPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [state, setState] = useState<State>('loading');

  useEffect(() => {
    if (!token) {
      setState('expired');
      return;
    }

    post('/api/subscriptions/claim/confirm', { token })
      .then(async (res) => {
        if (res.status === 401) {
          const next = encodeURIComponent(
            `/account/claim?token=${encodeURIComponent(token)}`
          );
          globalThis.location.href = `/login?next=${next}`;
          return;
        }
        if (res.ok) {
          setState('success');
          return;
        }
        const body = (await res.json().catch(() => ({}))) as {
          message?: string;
        };
        const msg = body.message ?? '';
        if (msg.includes('already used')) {
          setState('already_claimed');
        } else if (msg.includes('active subscription')) {
          setState('active_sub');
        } else {
          setState('expired');
        }
      })
      .catch(() => setState('error'));
  }, [token]);

  if (state === 'loading') return <SkeletonPage rows={2} />;

  return (
    <div className={sharedStyles.pageNarrow}>
      <div className={sharedStyles.card}>
        {state === 'success' && (
          <>
            <h1 className={sharedStyles.title}>Subscription claimed.</h1>
            <p>Your subscription is now attached to this account.</p>
            <a href="/account" className={sharedStyles.btnPrimary}>
              Go to account
            </a>
          </>
        )}
        {(state === 'expired' || state === 'error') && (
          <>
            <h1 className={sharedStyles.title}>Invalid or expired link.</h1>
            <p>
              This confirmation link is no longer valid. Start over from your
              account to request a new one.
            </p>
            <a href="/account" className={sharedStyles.btnPrimary}>
              Go to account
            </a>
          </>
        )}
        {state === 'already_claimed' && (
          <>
            <h1 className={sharedStyles.title}>Link already used.</h1>
            <p>
              This link is already used. Sign in and try again from your account
              page if you need to reclaim.
            </p>
            <a href="/account" className={sharedStyles.btnPrimary}>
              Go to account
            </a>
          </>
        )}
        {state === 'active_sub' && (
          <>
            <h1 className={sharedStyles.title}>
              Account already has a subscription.
            </h1>
            <p>
              This account already has an active subscription. Cancel it first
              or contact support.
            </p>
            <a href="/account" className={sharedStyles.btnPrimary}>
              Go to account
            </a>
          </>
        )}
      </div>
    </div>
  );
}
