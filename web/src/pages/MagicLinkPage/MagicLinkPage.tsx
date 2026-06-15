import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCookies } from 'react-cookie';
import { get2ankiApi } from '../../lib/backend/get2ankiApi';
import { getSearchPath } from '../../components/NavigationBar/helpers/getSearchPath';
import { stripUrlParam } from '../../lib/stripUrlParam';
import styles from '../../styles/auth.module.css';
import sharedStyles from '../../styles/shared.module.css';

type MagicLinkState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success' };

function MagicLinkPage() {
  const [searchParams] = useSearchParams();
  const [, setCookie] = useCookies(['token']);
  const [state, setState] = useState<MagicLinkState>({ status: 'loading' });
  const [retryEmail, setRetryEmail] = useState(
    () => localStorage.getItem('email') ?? ''
  );
  const [retrySending, setRetrySending] = useState(false);
  const [retryDone, setRetryDone] = useState(false);

  const token = searchParams.get('token');
  const redirect = searchParams.get('redirect');

  useEffect(() => {
    if (token == null) {
      setState({
        status: 'error',
        message: 'This link is invalid or has expired. Request a new one.',
      });
      return;
    }

    let cancelled = false;
    const validToken = token;
    stripUrlParam('token');

    async function validateToken() {
      try {
        const response = await get2ankiApi().validateMagicToken(validToken);
        if (cancelled) return;

        if (response.ok) {
          const data = await response.json();
          if (data.purpose === 'password_reset') {
            globalThis.location.href = `/users/r/${data.reset_token}`;
            return;
          }

          setCookie('token', data.token);
          setState({ status: 'success' });
          globalThis.location.href =
            redirect ?? data.redirect ?? getSearchPath('anki');
        } else {
          const errorData = await response.json().catch(() => ({}));
          setState({
            status: 'error',
            message:
              errorData.message ??
              'This link is invalid or has expired. Request a new one.',
          });
        }
      } catch {
        if (cancelled) return;
        setState({
          status: 'error',
          message: 'Something went wrong. Try again.',
        });
      }
    }

    validateToken();
    return () => {
      cancelled = true;
    };
  }, [token, redirect, setCookie]);

  const handleResendLink = async (event: React.SyntheticEvent) => {
    event.preventDefault();
    setRetrySending(true);
    setRetryDone(false);
    try {
      await get2ankiApi().requestMagicLink(retryEmail, 'login');
      setRetryDone(true);
    } catch {
      setState({
        status: 'error',
        message: 'Could not send a new link. Try again.',
      });
    } finally {
      setRetrySending(false);
    }
  };

  if (state.status === 'loading') {
    return (
      <div className={styles.formPage}>
        <div className={styles.formCard}>
          <h1 className={styles.formTitle}>Verifying your link</h1>
          <div className={sharedStyles.flexCenter} role="status">
            <div className={sharedStyles.spinner} />
            <span className={sharedStyles.srOnly}>Verifying your link</span>
          </div>
        </div>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className={styles.formPage}>
        <div className={styles.formCard}>
          <h1 className={styles.formTitle}>Link expired or invalid</h1>
          <p className={sharedStyles.formDescription}>{state.message}</p>
          {retryDone ? (
            <p className={styles.helpSuccess}>
              A new link has been sent to {retryEmail}.
            </p>
          ) : (
            <form onSubmit={handleResendLink}>
              <div className={styles.field}>
                <label htmlFor="retry-email">
                  <span>Email</span>
                  <input
                    id="retry-email"
                    name="email"
                    type="email"
                    value={retryEmail}
                    onChange={(e) => setRetryEmail(e.target.value)}
                    placeholder="Email address"
                    required
                  />
                </label>
              </div>
              <div className={styles.field}>
                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={retrySending || retryEmail.length === 0}
                >
                  {retrySending ? 'Sending' : 'Send a new link'}
                </button>
              </div>
            </form>
          )}
          <p className={styles.footerText}>
            <a rel="noreferrer" href="/login">
              Back to login
            </a>
          </p>
        </div>
      </div>
    );
  }

  return null;
}

export default MagicLinkPage;
