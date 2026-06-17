import { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { track } from '../../lib/analytics/track';
import { get2ankiApi } from '../../lib/backend/get2ankiApi';
import { AppStoreLinks } from '../../lib/interfaces/AppStoreLinks';
import styles from './NativeAppPage.module.css';
import sharedStyles from '../../styles/shared.module.css';

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

  return (
    <div className={styles.page}>
      <Helmet>
        <title>2anki for iPhone, iPad, and Mac</title>
      </Helmet>
      <img src="/mascot/Notion 1.png" alt="" className={styles.mascot} />
      <h1 className={styles.title}>2anki for iPhone, iPad, and Mac</h1>
      <p className={styles.body}>
        Convert your notes into Anki decks on the device you study with — no
        browser needed.
      </p>
      {links?.available && (
        <>
          <a
            className={styles.badge}
            href={links.iosUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track('native_app_store_clicked', { store: 'ios' })}
          >
            <img src="/badges/app-store.svg" alt="Download on the App Store" />
          </a>
          <p className={styles.caption}>
            Free on the App Store — iPhone, iPad, and Mac.
          </p>
        </>
      )}
      {links?.available === false && (
        <div className={styles.notice}>
          <p className={styles.noticeTitle}>Coming soon to the App Store</p>
          <p className={styles.noticeBody}>
            The app is in final review. Keep using 2anki on the web in the
            meantime.
          </p>
          <Link to="/" className={sharedStyles.btnPrimary}>
            Convert a deck on the web
          </Link>
        </div>
      )}
    </div>
  );
}
