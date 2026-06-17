import { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { track } from '../../lib/analytics/track';
import { get2ankiApi } from '../../lib/backend/get2ankiApi';
import { AppStoreLinks } from '../../lib/interfaces/AppStoreLinks';
import sharedStyles from '../../styles/shared.module.css';
import styles from './NativeAppPage.module.css';

export default function NativeAppPage() {
  const pageViewTracked = useRef(false);
  const [links, setLinks] = useState<AppStoreLinks | null>(null);

  useEffect(() => {
    if (pageViewTracked.current) return;
    pageViewTracked.current = true;
    track('native_app_page_viewed');
  }, []);

  useEffect(() => {
    let active = true;
    get2ankiApi()
      .getAppStoreLinks()
      .then((result) => {
        if (active) setLinks(result);
      })
      .catch(() => {
        if (active) setLinks({ available: false });
      });
    return () => {
      active = false;
    };
  }, []);

  const trackStoreClick = (store: 'ios' | 'mac') => {
    track('native_app_store_clicked', { store });
  };

  return (
    <div className={styles.page}>
      <Helmet>
        <title>2anki for iPhone, iPad, and Mac</title>
      </Helmet>
      <img src="/mascot/Notion 1.png" alt="" className={styles.mascot} />
      <h1 className={sharedStyles.title}>2anki for iPhone, iPad, and Mac</h1>
      <p className={styles.body}>
        Convert your notes into Anki decks on the device you study with — no
        browser needed.
      </p>
      {links?.available && (
        <>
          <div className={styles.badges}>
            <a
              className={styles.badge}
              href={links.iosUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackStoreClick('ios')}
            >
              <img
                src="/badges/app-store.svg"
                alt="Download on the App Store"
              />
            </a>
            <a
              className={styles.badge}
              href={links.macUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackStoreClick('mac')}
            >
              <img
                src="/badges/mac-app-store.svg"
                alt="Download on the Mac App Store"
              />
            </a>
          </div>
          <p className={styles.caption}>One app for iPhone, iPad, and Mac.</p>
        </>
      )}
      {links?.available === false && (
        <p className={styles.body}>
          Coming to the App Store shortly. Check What&apos;s New for the release
          date.
        </p>
      )}
    </div>
  );
}
