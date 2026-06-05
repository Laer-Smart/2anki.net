import { useState } from 'react';
import { Link } from 'react-router-dom';
import { post } from '../../lib/backend/api';
import sharedStyles from '../../styles/shared.module.css';
import styles from './ConsentModal.module.css';

interface ConsentModalProps {
  onAccept: () => void;
  onDismiss: () => void;
}

export default function ConsentModal({
  onAccept,
  onDismiss,
}: Readonly<ConsentModalProps>) {
  const [pending, setPending] = useState(false);
  const [needsSignIn, setNeedsSignIn] = useState(false);

  const handleAccept = async () => {
    setPending(true);
    try {
      const res = await post('/api/chat/consent', {});
      if (res.ok) {
        onAccept();
      } else {
        setNeedsSignIn(true);
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <dialog
      open
      className={styles.dialog}
      aria-modal="true"
      aria-labelledby="consent-heading"
    >
      <div className={sharedStyles.modalBackdrop} />
      <div className={sharedStyles.modalCardNarrow}>
        <div className={sharedStyles.modalHeader}>
          <h2 id="consent-heading" className={sharedStyles.modalHeaderTitle}>
            Chat sends your messages to Anthropic
          </h2>
        </div>
        <div className={sharedStyles.modalBody}>
          <p className={styles.body}>
            Your messages and any files you attach go to Anthropic to generate
            replies. They aren't used to train models. 20 messages a month on
            the free plan.
          </p>
          {needsSignIn && (
            <p className={styles.body}>
              <Link to="/login">Sign in</Link> to chat.
            </p>
          )}
          <div className={styles.actions}>
            <button
              type="button"
              className={`${sharedStyles.btnPrimary} ${sharedStyles.btnInline}`}
              onClick={handleAccept}
              disabled={pending}
            >
              Start chatting
            </button>
            <button
              type="button"
              className={`${sharedStyles.btnSecondary} ${sharedStyles.btnInline}`}
              onClick={onDismiss}
              disabled={pending}
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}
