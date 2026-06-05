import { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { track } from '../../lib/analytics/track';
import sharedStyles from '../../styles/shared.module.css';
import styles from './NativeAppPage.module.css';

const INTEREST_KEY = 'native_app_interest_clicked';

function hasRegisteredInterest(): boolean {
  return globalThis.localStorage?.getItem(INTEREST_KEY) != null;
}

export default function NativeAppPage() {
  const pageViewTracked = useRef(false);
  const [interestRegistered, setInterestRegistered] = useState(
    hasRegisteredInterest
  );

  useEffect(() => {
    if (pageViewTracked.current) return;
    pageViewTracked.current = true;
    track('native_app_page_viewed');
  }, []);

  const registerInterest = () => {
    if (hasRegisteredInterest()) {
      setInterestRegistered(true);
      return;
    }
    track('native_app_interest_clicked');
    globalThis.localStorage?.setItem(INTEREST_KEY, '1');
    setInterestRegistered(true);
  };

  return (
    <div className={styles.page}>
      <Helmet>
        <title>2anki for iPhone, iPad, and Mac</title>
      </Helmet>
      <img src="/mascot/Notion 1.png" alt="" className={styles.mascot} />
      <h1 className={sharedStyles.title}>2anki for iPhone, iPad, and Mac</h1>
      <p className={styles.body}>
        A native app is in the works. Convert your notes to Anki decks on the
        device you study with — no browser needed. Tap below and we'll count you
        in when we decide what ships first.
      </p>
      {interestRegistered ? (
        <p className={styles.noted}>Noted. Watch What's New for updates.</p>
      ) : (
        <button
          type="button"
          className={`${sharedStyles.btnPrimary} ${sharedStyles.btnInline}`}
          onClick={registerInterest}
        >
          I want this
        </button>
      )}
    </div>
  );
}
