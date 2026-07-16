import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from '../../styles/auth.module.css';
import sharedStyles from '../../styles/shared.module.css';

interface EmailProviderLink {
  labelKey: string;
  href: string;
}

function getEmailProviderLinks(email: string): EmailProviderLink[] {
  const domain = email.split('@')[1]?.toLowerCase();
  if (domain == null) return [];

  const links: EmailProviderLink[] = [];

  if (domain === 'gmail.com') {
    links.push({
      labelKey: 'auth.checkEmail.openGmail',
      href: 'https://mail.google.com',
    });
  }
  if (
    domain === 'outlook.com' ||
    domain === 'hotmail.com' ||
    domain === 'live.com'
  ) {
    links.push({
      labelKey: 'auth.checkEmail.openOutlook',
      href: 'https://outlook.live.com',
    });
  }
  if (domain === 'yahoo.com') {
    links.push({
      labelKey: 'auth.checkEmail.openYahoo',
      href: 'https://mail.yahoo.com',
    });
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
  const { t } = useTranslation();
  const [resendState, setResendState] = useState<
    'idle' | 'sending' | 'sent' | 'error'
  >('idle');
  const isLogin = purpose === 'login';
  const descBefore = isLogin
    ? t('auth.checkEmail.loginDescBefore')
    : t('auth.checkEmail.resetDescBefore');
  const descAfter = isLogin
    ? t('auth.checkEmail.loginDescAfter')
    : t('auth.checkEmail.resetDescAfter');
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
        <h1 className={styles.formTitle}>{t('auth.checkEmail.title')}</h1>
        <p className={sharedStyles.formDescription}>
          {descBefore}
          <strong>{email}</strong>
          {descAfter}
        </p>
        <p className={styles.helpMuted}>
          {t('auth.checkEmail.usuallyArrives')}
        </p>
        {providerLinks.length > 0 && (
          <div
            className={sharedStyles.flexRow}
            style={{ marginBottom: '1rem' }}
          >
            {providerLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className={sharedStyles.btnSmall}
              >
                {t(link.labelKey)}
              </a>
            ))}
          </div>
        )}
        <p className={styles.footerText}>
          {t('auth.checkEmail.didntGetIt')}
          <a
            href="#retry"
            onClick={(e) => {
              e.preventDefault();
              onRetry();
            }}
          >
            {t('auth.checkEmail.tryAgain')}
          </a>
          .
        </p>
        {onResend != null && (
          <div className={styles.field}>
            {resendState === 'sent' ? (
              <p className={styles.helpSuccess}>{t('auth.checkEmail.sent')}</p>
            ) : (
              <button
                type="button"
                className={styles.submitButton}
                onClick={handleResend}
                disabled={resendState === 'sending'}
              >
                {resendState === 'sending'
                  ? t('auth.checkEmail.sending')
                  : t('auth.checkEmail.resend')}
              </button>
            )}
            {resendState === 'error' && (
              <p className={styles.helpDanger}>
                {t('auth.checkEmail.resendError')}
              </p>
            )}
          </div>
        )}
        <p className={styles.helpMuted}>
          {t('auth.checkEmail.stillNothingPrefix')}
          <a href="mailto:support@2anki.net">support@2anki.net</a>
          {t('auth.checkEmail.stillNothingSuffix')}
        </p>
      </div>
    </div>
  );
}

export default CheckYourEmail;
