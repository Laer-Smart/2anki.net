import { SyntheticEvent, useState } from 'react';

import { ErrorHandlerType } from '../../errors/helpers/getErrorMessage';
import CheckYourEmail from '../../CheckYourEmail/CheckYourEmail';
import { get2ankiApi } from '../../../lib/backend/get2ankiApi';
import styles from '../../../styles/auth.module.css';
import sharedStyles from '../../../styles/shared.module.css';

interface ForgotPasswordProps {
  setError: ErrorHandlerType;
}

function ForgotPasswordForm({ setError }: Readonly<ForgotPasswordProps>) {
  const [email, setEmail] = useState(localStorage.getItem('email') || '');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: SyntheticEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      await get2ankiApi().requestMagicLink(email, 'password_reset');
      setSubmitted(true);
    } catch (error) {
      setError(error);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <CheckYourEmail
        email={email}
        onRetry={() => setSubmitted(false)}
        purpose="password_reset"
      />
    );
  }

  return (
    <div className={styles.formPage}>
      <div className={styles.formCard}>
        <h1 className={styles.formTitle}>Reset your password</h1>
        <p className={sharedStyles.formDescription}>
          Enter your email to receive a password reset link.
        </p>
        <form onSubmit={handleSubmit}>
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
                placeholder="Email address"
                required
              />
            </label>
          </div>
          <div className={styles.field}>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading || email.length === 0}
            >
              {loading ? 'Sending' : 'Send reset link'}
            </button>
          </div>
        </form>
        <p className={styles.footerText}>
          <a rel="noreferrer" href="/login">
            Back to login
          </a>
        </p>
      </div>
    </div>
  );
}

export default ForgotPasswordForm;
