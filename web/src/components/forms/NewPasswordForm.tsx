import { SyntheticEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ErrorHandlerType } from '../errors/helpers/getErrorMessage';
import { get2ankiApi } from '../../lib/backend/get2ankiApi';
import styles from '../../styles/auth.module.css';
import sharedStyles from '../../styles/shared.module.css';

interface Props {
  setErrorMessage: ErrorHandlerType;
}

const MIN_PASSWORD_LENGTH = 8;

function NewPasswordForm({ setErrorMessage }: Readonly<Props>) {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const passwordTouched = password.length > 0;
  const passwordMeetsMinimum = password.length >= MIN_PASSWORD_LENGTH;
  const passwordsMatch = password === confirmPassword;
  const confirmTouched = confirmPassword.length > 0;
  const showMismatch = passwordTouched && confirmTouched && !passwordsMatch;

  const isValid = () =>
    passwordsMatch && passwordMeetsMinimum && password.length < 256;

  const passwordHelpClass = (() => {
    if (passwordTouched) {
      return passwordMeetsMinimum ? styles.helpSuccess : styles.helpDanger;
    }
    return styles.helpMuted;
  })();

  const passwordHelpText = passwordMeetsMinimum
    ? t('auth.common.passwordHelpGood')
    : t('auth.common.passwordHelpMin');

  const handleSubmit = async (event: SyntheticEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      const paths = globalThis.location.pathname.split('/');
      const resetToken = paths.at(-1) ?? '';
      const res = await get2ankiApi().newPassword(password, resetToken);
      if (res.status === 200) {
        globalThis.location.href = '/login';
      } else {
        setResetError(t('auth.newPassword.resetError'));
      }
      setLoading(false);
    } catch (error) {
      setErrorMessage(error as Error);
      setLoading(false);
    }
  };

  return (
    <div className={styles.formPage}>
      <div className={styles.formCard}>
        <h1 className={styles.formTitle}>{t('auth.newPassword.title')}</h1>
        <p className={sharedStyles.formDescription}>
          {t('auth.newPassword.description')}
        </p>
        <form onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label htmlFor="password">
              <span>{t('auth.newPassword.newLabel')}</span>
              <input
                id="password"
                min="8"
                max="255"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                }}
                type="password"
                autoComplete="new-password"
                placeholder={t('auth.newPassword.newPlaceholder')}
                required
                aria-describedby="password-help"
              />
            </label>
            <p id="password-help" className={passwordHelpClass}>
              {passwordHelpText}
            </p>
          </div>
          <div className={styles.field}>
            <label htmlFor="confirm_password">
              <span>{t('auth.newPassword.confirmLabel')}</span>
              <input
                id="confirm_password"
                min="8"
                max="255"
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value);
                }}
                type="password"
                autoComplete="new-password"
                placeholder={t('auth.newPassword.confirmPlaceholder')}
                required
                aria-describedby={
                  showMismatch ? 'confirm-password-help' : undefined
                }
              />
            </label>
            {showMismatch && (
              <p
                id="confirm-password-help"
                role="alert"
                className={styles.helpDanger}
              >
                {t('auth.newPassword.mismatch')}
              </p>
            )}
          </div>
          <div className={styles.field}>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={!isValid() || loading}
            >
              {loading
                ? t('auth.newPassword.saving')
                : t('auth.newPassword.resetPassword')}
            </button>
            {resetError && <p className={styles.helpDanger}>{resetError}</p>}
          </div>
        </form>
      </div>
    </div>
  );
}

export default NewPasswordForm;
