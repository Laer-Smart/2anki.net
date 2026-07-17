import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('accountx');
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
            <h1 className={sharedStyles.title}>{t('claim.successTitle')}</h1>
            <p>{t('claim.successBody')}</p>
            <a href="/account" className={sharedStyles.btnPrimary}>
              {t('claim.goToAccount')}
            </a>
          </>
        )}
        {(state === 'expired' || state === 'error') && (
          <>
            <h1 className={sharedStyles.title}>{t('claim.expiredTitle')}</h1>
            <p>{t('claim.expiredBody')}</p>
            <a href="/account" className={sharedStyles.btnPrimary}>
              {t('claim.goToAccount')}
            </a>
          </>
        )}
        {state === 'already_claimed' && (
          <>
            <h1 className={sharedStyles.title}>
              {t('claim.alreadyUsedTitle')}
            </h1>
            <p>{t('claim.alreadyUsedBody')}</p>
            <a href="/account" className={sharedStyles.btnPrimary}>
              {t('claim.goToAccount')}
            </a>
          </>
        )}
        {state === 'active_sub' && (
          <>
            <h1 className={sharedStyles.title}>{t('claim.activeSubTitle')}</h1>
            <p>{t('claim.activeSubBody')}</p>
            <a href="/account" className={sharedStyles.btnPrimary}>
              {t('claim.goToAccount')}
            </a>
          </>
        )}
      </div>
    </div>
  );
}
