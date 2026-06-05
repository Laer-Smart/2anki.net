import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import TopMessage from '../../../../components/TopMessage/TopMessage';
import CheckYourEmail from '../../../../components/CheckYourEmail/CheckYourEmail';
import { isValidCredentials } from './helpers/isValidCredentials';
import { useHandleLoginSubmit } from './helpers/useHandleLoginSubmit';
import { getVisibleText } from '../../../../lib/text/getVisibleText';
import { WithGoogleLink } from '../../../../components/forms/WithGoogleLink';
import { WithNotionLink } from '../../../../components/forms/WithNotionLink';
import { WithAppleLink } from '../../../../components/forms/WithAppleLink';
import { WithMicrosoftLink } from '../../../../components/forms/WithMicrosoftLink';
import { get2ankiApi } from '../../../../lib/backend/get2ankiApi';
import styles from '../../../../styles/auth.module.css';
import loginStyles from './LoginForm.module.css';

type LoginStep = 'email' | 'password' | 'check-email';

function LoginForm() {
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<LoginStep>('email');
  const [magicLinkLoading, setMagicLinkLoading] = useState(false);
  const { email, password, loading, onSubmit, setEmail, setPassword } =
    useHandleLoginSubmit((e) => setError((e as Error).message));

  const registerHref =
    searchParams.get('error') === 'upload_limit_exceeded'
      ? '/register?redirect=/pricing'
      : '/register';

  const handleSendMagicLink = async () => {
    setMagicLinkLoading(true);
    setError(null);
    try {
      await get2ankiApi().requestMagicLink(email, 'login');
      setStep('check-email');
    } catch {
      setError(
        "We couldn't send your sign-in link right now. Try again in a minute, or use your password below."
      );
    } finally {
      setMagicLinkLoading(false);
    }
  };

  const handleRetryMagicLink = () => {
    setStep('email');
  };

  if (step === 'check-email') {
    return (
      <CheckYourEmail
        email={email}
        onRetry={handleRetryMagicLink}
        purpose="login"
        onResend={handleSendMagicLink}
      />
    );
  }

  const isEmailStep = step === 'email';

  return (
    <div className={styles.formPage}>
      <img src="/mascot/Notion 1.png" alt="" className={loginStyles.mascot} />
      <div className={styles.formCard}>
        <TopMessage />
        <h1 className={styles.formTitle}>Log in to 2anki</h1>
        <p className={loginStyles.subtitle}>Turn your notes into Anki cards.</p>
        {isEmailStep ? (
          <>
            <div className={styles.field}>
              <label htmlFor="email">
                <span>Email</span>
                <input
                  id="email"
                  name="email"
                  min="3"
                  max="255"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  onBlur={(event) => {
                    if (event.target.value.includes('@')) {
                      localStorage.setItem('email', event.target.value);
                    }
                  }}
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  required
                />
              </label>
              <p className={styles.helpMuted}>
                We&apos;ll email you a sign-in link — no password needed.
              </p>
            </div>
            <div className={styles.field}>
              <button
                type="button"
                className={styles.submitButton}
                disabled={email.length === 0 || magicLinkLoading}
                onClick={handleSendMagicLink}
              >
                {magicLinkLoading ? 'Sending' : 'Email me a sign-in link'}
              </button>
              {error && <p className={styles.helpDanger}>{error}</p>}
            </div>
            <p className={styles.footerText}>
              <a
                href="#password"
                onClick={(e) => {
                  e.preventDefault();
                  setError(null);
                  setStep('password');
                }}
              >
                Use password instead
              </a>
            </p>
            <p className={styles.footerText}>
              <a rel="noreferrer" href="/forgot">
                Forgot your password?
              </a>
            </p>
            <div className={styles.divider}>
              <span className={styles.dividerLabel}>Or use a provider</span>
            </div>
            <div className={styles.oauthGrid}>
              <WithGoogleLink
                variant="card"
                text={getVisibleText('navigation.login.google')}
              />
              <WithNotionLink variant="card" text="Continue with Notion" />
              <WithMicrosoftLink
                variant="card"
                text={getVisibleText('navigation.login.microsoft')}
              />
              <WithAppleLink variant="card" text="Sign in with Apple" />
            </div>
          </>
        ) : (
          <form onSubmit={onSubmit}>
            <div className={styles.field}>
              <label htmlFor="email">
                <span>Email</span>
                <input
                  id="email"
                  name="email"
                  value={email}
                  type="email"
                  autoComplete="email"
                  readOnly
                />
              </label>
              <p className={styles.helpMuted}>
                <a
                  href="#change"
                  onClick={(e) => {
                    e.preventDefault();
                    setError(null);
                    setStep('email');
                  }}
                >
                  Change
                </a>
              </p>
            </div>
            <div className={styles.field}>
              <label htmlFor="password">
                <span>Password</span>
                <input
                  id="password"
                  name="password"
                  min="8"
                  max="255"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  type="password"
                  autoComplete="current-password"
                  placeholder="Password"
                  autoFocus
                />
              </label>
            </div>
            <div className={styles.field}>
              <button
                type="submit"
                className={styles.submitButton}
                disabled={!isValidCredentials(email, password) || loading}
              >
                {loading ? 'Logging in…' : 'Log in'}
              </button>
              {error && <p className={styles.helpDanger}>{error}</p>}
            </div>
            <p className={styles.footerText}>
              <a rel="noreferrer" href="/forgot">
                Forgot your password?
              </a>
            </p>
            <p className={styles.footerText}>
              <a
                href="#magic-link"
                onClick={(e) => {
                  e.preventDefault();
                  handleSendMagicLink();
                }}
              >
                {magicLinkLoading ? 'Sending' : 'Send a login link instead'}
              </a>
            </p>
          </form>
        )}
        <p className={styles.footerText}>
          {"Don't have an account?"}{' '}
          <a rel="noreferrer" href={registerHref}>
            {"Sign up — it's free"}
          </a>
        </p>
      </div>
    </div>
  );
}

export default LoginForm;
