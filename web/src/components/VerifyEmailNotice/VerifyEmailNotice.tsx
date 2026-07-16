import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './VerifyEmailNotice.module.css';

const FLAG_KEY = 'email_verification_pending';

function readPending(): boolean {
  try {
    return globalThis.sessionStorage?.getItem(FLAG_KEY) != null;
  } catch {
    return false;
  }
}

function clearPending(): void {
  try {
    globalThis.sessionStorage?.removeItem(FLAG_KEY);
  } catch {
    // sessionStorage may be unavailable; nothing to clear.
  }
}

interface VerifyEmailNoticeProps {
  emailVerified?: boolean;
}

export function VerifyEmailNotice({
  emailVerified,
}: Readonly<VerifyEmailNoticeProps>) {
  const { t } = useTranslation('account');
  const [pending, setPending] = useState(() => readPending());

  useEffect(() => {
    if (emailVerified === true && pending) {
      clearPending();
      setPending(false);
    }
  }, [emailVerified, pending]);

  if (emailVerified === true || !pending) return null;

  const dismiss = () => {
    clearPending();
    setPending(false);
  };

  return (
    <output className={styles.banner}>
      <span className={styles.message}>{t('verifyEmail.message')}</span>
      <button
        type="button"
        className={styles.dismiss}
        aria-label={t('verifyEmail.dismiss')}
        onClick={dismiss}
      >
        {t('verifyEmail.dismiss')}
      </button>
    </output>
  );
}
