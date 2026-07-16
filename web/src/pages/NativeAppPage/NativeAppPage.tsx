import { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { track } from '../../lib/analytics/track';
import { get2ankiApi } from '../../lib/backend/get2ankiApi';
import { AppStoreLinks } from '../../lib/interfaces/AppStoreLinks';
import styles from './NativeAppPage.module.css';
import sharedStyles from '../../styles/shared.module.css';

const CANONICAL = 'https://2anki.net/app';

const FORMATS = ['Markdown', 'PDF', 'Notion', 'CSV', 'OPML', 'Kindle', '.apkg'];

const FEATURE_KEYS = [
  { title: 'nativeApp.feature1Title', body: 'nativeApp.feature1Body' },
  { title: 'nativeApp.feature2Title', body: 'nativeApp.feature2Body' },
  { title: 'nativeApp.feature3Title', body: 'nativeApp.feature3Body' },
];

const STEP_KEYS = [
  { n: '1', title: 'nativeApp.step1Title', body: 'nativeApp.step1Body' },
  { n: '2', title: 'nativeApp.step2Title', body: 'nativeApp.step2Body' },
  { n: '3', title: 'nativeApp.step3Title', body: 'nativeApp.step3Body' },
];

const FAQ_KEYS = [
  { q: 'nativeApp.faq1Q', a: 'nativeApp.faq1A' },
  { q: 'nativeApp.faq2Q', a: 'nativeApp.faq2A' },
  { q: 'nativeApp.faq3Q', a: 'nativeApp.faq3A' },
  { q: 'nativeApp.faq4Q', a: 'nativeApp.faq4A' },
  { q: 'nativeApp.faq5Q', a: 'nativeApp.faq5A' },
];

interface Screenshot {
  src: string;
  altKey: string;
}

const HERO_SHOT: Screenshot = {
  src: '/app-screenshots/iphone-1.png',
  altKey: 'nativeApp.heroShotAlt',
};

const IPHONE_SHOTS: Screenshot[] = [
  { src: '/app-screenshots/iphone-1.png', altKey: 'nativeApp.iphoneShot1Alt' },
  { src: '/app-screenshots/iphone-2.png', altKey: 'nativeApp.iphoneShot2Alt' },
  { src: '/app-screenshots/iphone-3.png', altKey: 'nativeApp.iphoneShot3Alt' },
  { src: '/app-screenshots/iphone-4.png', altKey: 'nativeApp.iphoneShot4Alt' },
];

const IPAD_SHOTS: Screenshot[] = [
  { src: '/app-screenshots/ipad-1.png', altKey: 'nativeApp.ipadShot1Alt' },
  { src: '/app-screenshots/ipad-2.png', altKey: 'nativeApp.ipadShot2Alt' },
  { src: '/app-screenshots/ipad-3.png', altKey: 'nativeApp.ipadShot3Alt' },
];

function PhoneFrame({ src, alt }: { src: string; alt: string }) {
  return (
    <div className={styles.phoneFrame}>
      <img src={src} alt={alt} loading="lazy" />
    </div>
  );
}

export default function NativeAppPage() {
  const { t } = useTranslation('marketing');
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

  const metaTitle = t('nativeApp.metaTitle');
  const metaDescription = t('nativeApp.metaDescription');

  const downloadCta = (placement: string) =>
    links?.available && (
      <div className={styles.ctaGroup}>
        <a
          className={styles.badge}
          aria-label={t('nativeApp.downloadAria')}
          href={links.iosUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() =>
            track('native_app_store_clicked', { store: 'ios', placement })
          }
        >
          <img
            className={styles.badgeLight}
            src="/badges/app-store.svg"
            alt=""
          />
          <img
            className={styles.badgeDark}
            src="/badges/app-store-white.svg"
            alt=""
          />
        </a>
        {links.macUrl && (
          <a
            className={styles.macLink}
            href={links.macUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() =>
              track('native_app_store_clicked', { store: 'mac', placement })
            }
          >
            {t('nativeApp.alsoMac')} <span aria-hidden="true">→</span>
          </a>
        )}
      </div>
    );

  return (
    <div className={styles.page}>
      <Helmet>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href={CANONICAL} />
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:url" content={CANONICAL} />
        <meta property="og:type" content="website" />
      </Helmet>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.pill}>{t('nativeApp.pill')}</span>
          <h1 className={styles.title}>{metaTitle}</h1>
          <p className={styles.body}>{t('nativeApp.heroBody')}</p>
          {downloadCta('hero')}
          {links?.available && (
            <p className={styles.caption}>{t('nativeApp.caption')}</p>
          )}
          {links?.available === false && (
            <div className={styles.notice}>
              <p className={styles.noticeTitle}>
                {t('nativeApp.comingSoonTitle')}
              </p>
              <p className={styles.noticeBody}>
                {t('nativeApp.comingSoonBody')}
              </p>
              <Link to="/" className={sharedStyles.btnPrimary}>
                {t('nativeApp.convertWeb')}
              </Link>
            </div>
          )}
        </div>
        <div className={styles.heroArt}>
          <PhoneFrame src={HERO_SHOT.src} alt={t(HERO_SHOT.altKey)} />
        </div>
      </section>

      <section className={styles.formats}>
        <p className={styles.formatsLabel}>{t('nativeApp.formatsLabel')}</p>
        <div className={styles.formatsRow}>
          {FORMATS.map((f) => (
            <span key={f} className={styles.formatChip}>
              {f}
            </span>
          ))}
        </div>
      </section>

      <section className={styles.features}>
        {FEATURE_KEYS.map((feature) => (
          <div key={feature.title} className={styles.featureCard}>
            <h2 className={styles.featureTitle}>{t(feature.title)}</h2>
            <p className={styles.featureBody}>{t(feature.body)}</p>
          </div>
        ))}
      </section>

      <section className={styles.steps}>
        <h2 className={styles.sectionHeading}>{t('nativeApp.stepsHeading')}</h2>
        <div className={styles.stepsRow}>
          {STEP_KEYS.map((step) => (
            <div key={step.n} className={styles.stepCard}>
              <span className={styles.stepNumber}>{step.n}</span>
              <h3 className={styles.stepTitle}>{t(step.title)}</h3>
              <p className={styles.stepBody}>{t(step.body)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.screenshots}>
        <h2 className={styles.sectionHeading}>
          {t('nativeApp.screenshotsHeading')}
        </h2>
        <div className={styles.phoneGallery}>
          {IPHONE_SHOTS.map((shot) => (
            <PhoneFrame key={shot.src} src={shot.src} alt={t(shot.altKey)} />
          ))}
        </div>
        <div className={styles.ipadGallery}>
          {IPAD_SHOTS.map((shot) => (
            <div key={shot.src} className={styles.ipadCard}>
              <img src={shot.src} alt={t(shot.altKey)} loading="lazy" />
            </div>
          ))}
        </div>
      </section>

      <section className={styles.faq}>
        <h2 className={styles.sectionHeading}>{t('nativeApp.faqHeading')}</h2>
        <div className={styles.faqList}>
          {FAQ_KEYS.map((faq) => (
            <details key={faq.q} className={styles.faqItem}>
              <summary className={styles.faqQuestion}>{t(faq.q)}</summary>
              <p className={styles.faqAnswer}>{t(faq.a)}</p>
            </details>
          ))}
        </div>
      </section>

      <section className={styles.finalCta}>
        <h2 className={styles.finalTitle}>{t('nativeApp.finalTitle')}</h2>
        <p className={styles.finalBody}>{t('nativeApp.finalBody')}</p>
        {downloadCta('footer')}
        {links?.available === false && (
          <Link to="/" className={sharedStyles.btnPrimary}>
            {t('nativeApp.convertWeb')}
          </Link>
        )}
      </section>
    </div>
  );
}
