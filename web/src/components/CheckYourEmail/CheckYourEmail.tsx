import { useState } from 'react';
import styles from '../../styles/auth.module.css';
import sharedStyles from '../../styles/shared.module.css';

interface EmailProviderLink {
  label: string;
  href: string;
}

function getEmailProviderLinks(email: string): EmailProviderLink[] {
  const domain = email.split('@')[1]?.toLowerCase();
  if (domain == null) return [];

  const links: EmailProviderLink[] = [];

  if (domain === 'gmail.com') {
    links.push({ label: 'Open Gmail', href: 'https://mail.google.com' });
  }
  if (
    domain === 'outlook.com' ||
    domain === 'hotmail.com' ||
    domain === 'live.com'
  ) {
    links.push({
      label: 'Open Outlook',
      href: 'https://outlook.live.com',
    });
  }
  if (domain === 'yahoo.com') {
    links.push({ label: 'Open Yahoo Mail', href: 'https://mail.yahoo.com' });
  }

  return links;
}

interface CheckYourEmailProps {
  email: string;
  onRetry: () => void;
  purpose: 'login' | 'password_reset';
  onResend?: () => Promise<void>;
}

function CheckYourEmail({
  email,
  onRetry,
  purpose,
  onResend,
}: Readonly<CheckYourEmailProps>) {
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const isLogin = purpose === 'login';
  const linkType = isLogin ? 'login link' : 'password reset link';
  const actionText = isLogin ? 'log in' : 'reset your password';
  const providerLinks = getEmailProviderLinks(email);

  const handleResend = async () => {
    if (onResend == null) return;
    setResendState('sending');
    try {
      await onResend();
      setResendState('sent');
    } catch {
      setResendState('error');
    }
  };

  return (
    <div className={styles.formPage}>
      <div className={styles.formCard}>
        <h1 className={styles.formTitle}>Check your email</h1>
        <p className={sharedStyles.formDescription}>
          A {linkType} was sent to <strong>{email}</strong>. Click the link to
          {' '}{actionText}. It expires in 15 minutes.
        </p>
        <p className={styles.helpMuted}>Usually arrives within a minute.</p>
        {providerLinks.length > 0 && (
          <div className={sharedStyles.flexRow} style={{ marginBottom: '1rem' }}>
            {providerLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className={sharedStyles.btnSmall}
              >
                {link.label}
              </a>
            ))}
          </div>
        )}
        <p className={styles.footerText}>
          {"Didn't get it? Check your spam folder, or "}
          <a
            href="#retry"
            onClick={(e) => {
              e.preventDefault();
              onRetry();
            }}
          >
            try again
          </a>
          .
        </p>
        {onResend != null && (
          <div className={styles.field}>
            {resendState === 'sent' ? (
              <p className={styles.helpSuccess}>Sent!</p>
            ) : (
              <button
                type="button"
                className={styles.submitButton}
                onClick={handleResend}
                disabled={resendState === 'sending'}
              >
                {resendState === 'sending' ? 'Sending…' : 'Resend link'}
              </button>
            )}
            {resendState === 'error' && (
              <p className={styles.helpDanger}>
                {"Couldn't send another link right now. Check your inbox and spam, or email support@2anki.net."}
              </p>
            )}
          </div>
        )}
        <p className={styles.helpMuted}>
          {'Still nothing after checking spam? Email '}
          <a href="mailto:support@2anki.net">support@2anki.net</a>
          {' — we\'ll get you in.'}
        </p>
      </div>
    </div>
  );
}

export default CheckYourEmail;
