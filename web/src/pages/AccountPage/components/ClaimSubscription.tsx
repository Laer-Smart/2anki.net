import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { post } from '../../../lib/backend/api';
import styles from '../AccountPage.module.css';
import sharedStyles from '../../../styles/shared.module.css';

type Status = 'idle' | 'loading' | 'success' | 'error';

export function ClaimSubscription() {
  const { t } = useTranslation('account');
  const [expanded, setExpanded] = useState(false);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    const res = await post('/api/subscriptions/claim', { email });

    if (res.ok) {
      setStatus('success');
    } else {
      setStatus('error');
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      setErrorMessage(body.message ?? t('claimSubscription.error'));
    }
  };

  return (
    <div className={styles.section}>
      <button
        type="button"
        className={sharedStyles.btnGhost}
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
        style={{
          fontWeight: 'var(--font-semibold)',
          width: '100%',
          textAlign: 'left',
          padding: 0,
        }}
      >
        {t('claimSubscription.paidDifferentEmail')}
      </button>

      {expanded && (
        <div style={{ marginTop: '1rem' }}>
          {status === 'success' ? (
            <output style={{ margin: 0, display: 'block' }}>
              {t('claimSubscription.sent')}
            </output>
          ) : (
            <>
              <p
                style={{
                  margin: '0 0 1rem',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                {t('claimSubscription.description')}
              </p>
              <form
                onSubmit={handleSubmit}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('claimSubscription.emailPlaceholder')}
                  required
                  disabled={status === 'loading'}
                  aria-label={t('claimSubscription.emailLabel')}
                />
                {status === 'error' && (
                  <p
                    role="alert"
                    style={{
                      margin: 0,
                      color: 'var(--color-danger)',
                      fontSize: 'var(--text-sm)',
                    }}
                  >
                    {errorMessage}
                  </p>
                )}
                <button
                  type="submit"
                  className={sharedStyles.btnPrimary}
                  disabled={status === 'loading' || !email}
                >
                  {status === 'loading'
                    ? t('claimSubscription.sending')
                    : t('claimSubscription.sendConfirmation')}
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}
