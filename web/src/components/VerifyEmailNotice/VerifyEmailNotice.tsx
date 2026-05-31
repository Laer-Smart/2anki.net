import { useEffect, useState } from 'react';
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
      <span className={styles.message}>
        Check your inbox — confirm your email to secure your account.
      </span>
      <button
        type="button"
        className={styles.dismiss}
        aria-label="Dismiss"
        onClick={dismiss}
      >
        Dismiss
      </button>
    </output>
  );
}
