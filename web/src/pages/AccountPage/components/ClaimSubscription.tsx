import { useState } from 'react';
import { post } from '../../../lib/backend/api';
import styles from '../AccountPage.module.css';
import sharedStyles from '../../../styles/shared.module.css';

type Status = 'idle' | 'loading' | 'success' | 'error';

export function ClaimSubscription() {
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
      const body = await res.json().catch(() => ({})) as { message?: string };
      setErrorMessage(body.message ?? 'Something went wrong. Try again in a moment.');
    }
  };

  return (
    <div className={styles.section}>
      <button
        type="button"
        className={sharedStyles.btnGhost}
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
        style={{ fontWeight: 'var(--font-semibold)', width: '100%', textAlign: 'left', padding: 0 }}
      >
        Paid with a different email?
      </button>

      {expanded && (
        <div style={{ marginTop: '1rem' }}>
          {status === 'success' ? (
            <output style={{ margin: 0, display: 'block' }}>
              Sent. Check that inbox for a confirmation link.
            </output>
          ) : (
            <>
              <p style={{ margin: '0 0 1rem', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                If you paid Stripe with another email address, enter it here. We'll send a confirmation link to that address to attach the subscription to this account.
              </p>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email you paid with"
                  required
                  disabled={status === 'loading'}
                  aria-label="Email you paid with"
                />
                {status === 'error' && (
                  <p role="alert" style={{ margin: 0, color: 'var(--color-danger)', fontSize: 'var(--text-sm)' }}>
                    {errorMessage}
                  </p>
                )}
                <button
                  type="submit"
                  className={sharedStyles.btnPrimary}
                  disabled={status === 'loading' || !email}
                >
                  {status === 'loading' ? 'Sending…' : 'Send confirmation email'}
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}
