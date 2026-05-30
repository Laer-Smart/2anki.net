import { Link } from 'react-router-dom';
import useQuery from '../../lib/hooks/useQuery';
import styles from '../../styles/shared.module.css';

const SIGN_IN_FALLBACK =
  "Couldn't sign you in. Try again, or use your email below.";

const ERROR_MESSAGES: Record<string, string> = {
  google_signin_failed:
    "Couldn't sign you in with Google. Try again, or use your email below.",
  microsoft_signin_failed:
    "Couldn't sign you in with Microsoft. Try again, or use your email below.",
  notion_cancelled:
    "Couldn't sign you in with Notion. Try again, or use your email below.",
};

function TopMessage() {
  const query = useQuery();
  const errorCode = query.get('error');
  const verified = query.get('verified');

  if (verified === '1') {
    return (
      <output className={styles.alertSuccess}>
        <p>Email verified. Sign in to continue.</p>
      </output>
    );
  }

  if (errorCode === 'upload_limit_exceeded') {
    return (
      <div className={styles.alertDanger}>
        <p>
          You&apos;ve reached your monthly limit.{' '}
          <Link to="/pricing">Upgrade</Link> to convert more.
        </p>
      </div>
    );
  }
  if (errorCode) {
    return (
      <div className={styles.alertDanger}>
        <p>{ERROR_MESSAGES[errorCode] ?? SIGN_IN_FALLBACK}</p>
      </div>
    );
  }

  return null;
}

export default TopMessage;
