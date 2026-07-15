import { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { track } from '../../lib/analytics/track';
import { get2ankiApi } from '../../lib/backend/get2ankiApi';
import { AppStoreLinks } from '../../lib/interfaces/AppStoreLinks';
import styles from './NativeAppPage.module.css';
import sharedStyles from '../../styles/shared.module.css';

const CANONICAL = 'https://2anki.net/app';
const META_DESCRIPTION =
  'Convert your notes and files into Anki decks on iPhone, iPad, and Mac. Markdown, PDF, Notion, CSV, OPML, Kindle — parsed on your device. On the App Store for iPhone, iPad, and Mac.';

const FORMATS = ['Markdown', 'PDF', 'Notion', 'CSV', 'OPML', 'Kindle', '.apkg'];

const FEATURES = [
  {
    title: 'Parsed on your device',
    body: 'Your files never leave your Mac, iPhone, or iPad to become cards. Markdown, PDFs, and exports are converted locally — private by default.',
  },
  {
    title: 'Build decks with AI chat',
    body: 'Paste a topic or a wall of notes and let chat draft the cards. Preview every front and back before anything reaches Anki.',
  },
  {
    title: 'Every format, one tap to Anki',
    body: 'Markdown, PDF, Notion exports, CSV, OPML, and Kindle highlights all land as a clean .apkg you open straight in Anki.',
  },
];

const STEPS = [
  {
    n: '1',
    title: 'Drop a file or paste notes',
    body: 'Pick a Markdown file, PDF, Notion export, CSV, or Kindle clipping — or just paste text.',
  },
  {
    n: '2',
    title: 'Preview the cards',
    body: 'See every generated front and back. Tidy them up before they leave the app.',
  },
  {
    n: '3',
    title: 'Open in Anki',
    body: 'Export a ready-to-study .apkg and review it in Anki — the app you already trust.',
  },
];

const FAQS = [
  {
    q: 'Is the app free?',
    a: 'Yes — downloading and converting files on-device is free. AI deck generation and unlimited use are optional paid upgrades.',
  },
  {
    q: 'Do I need an account?',
    a: 'No account is needed to convert your own files locally. You only sign in for AI chat decks and live Notion sync.',
  },
  {
    q: 'Does it replace Anki?',
    a: 'No. 2anki builds the deck; Anki reviews it. The app hands off a standard .apkg and gets out of the way.',
  },
  {
    q: 'Which files can it convert?',
    a: 'Markdown, PDF, Notion exports (.zip), CSV, OPML, Kindle highlights, and existing .apkg files.',
  },
  {
    q: 'Does it run on Mac and iPhone?',
    a: 'One download covers iPhone, iPad, and Mac — the same on-device conversion on all three.',
  },
];

interface Screenshot {
  src: string;
  alt: string;
}

const HERO_SHOT: Screenshot = {
  src: '/app-screenshots/iphone-1.png',
  alt: '2anki on iPhone — the Make flashcards home screen',
};

const IPHONE_SHOTS: Screenshot[] = [
  {
    src: '/app-screenshots/iphone-1.png',
    alt: '2anki on iPhone — Make flashcards home screen with drag-and-drop file upload',
  },
  {
    src: '/app-screenshots/iphone-2.png',
    alt: '2anki on iPhone — AI chat prompts to build a deck from a topic or your notes',
  },
  {
    src: '/app-screenshots/iphone-3.png',
    alt: '2anki on iPhone — previewing generated cards before saving the .apkg',
  },
  {
    src: '/app-screenshots/iphone-4.png',
    alt: '2anki on iPhone — chat history of past decks',
  },
];

const IPAD_SHOTS: Screenshot[] = [
  {
    src: '/app-screenshots/ipad-1.png',
    alt: '2anki on iPad — Make flashcards with the full sidebar of conversion tools',
  },
  {
    src: '/app-screenshots/ipad-2.png',
    alt: '2anki on iPad — AI chat generating a European capitals deck',
  },
  {
    src: '/app-screenshots/ipad-3.png',
    alt: '2anki on iPad — AI chat prompt starters',
  },
];

function PhoneFrame({ src, alt }: Screenshot) {
  return (
    <div className={styles.phoneFrame}>
      <img src={src} alt={alt} loading="lazy" />
    </div>
  );
}

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

  const downloadCta = (placement: string) =>
    links?.available && (
      <div className={styles.ctaGroup}>
        <a
          className={styles.badge}
          aria-label="Download on the App Store"
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
            Also on the Mac App Store <span aria-hidden="true">→</span>
          </a>
        )}
      </div>
    );

  return (
    <div className={styles.page}>
      <Helmet>
        <title>2anki for iPhone, iPad, and Mac</title>
        <meta name="description" content={META_DESCRIPTION} />
        <link rel="canonical" href={CANONICAL} />
        <meta property="og:title" content="2anki for iPhone, iPad, and Mac" />
        <meta property="og:description" content={META_DESCRIPTION} />
        <meta property="og:url" content={CANONICAL} />
        <meta property="og:type" content="website" />
      </Helmet>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.pill}>Now on iPhone, iPad &amp; Mac</span>
          <h1 className={styles.title}>2anki for iPhone, iPad, and Mac</h1>
          <p className={styles.body}>
            Convert your notes into Anki decks on the device you study with — no
            browser needed.
          </p>
          {downloadCta('hero')}
          {links?.available && (
            <p className={styles.caption}>
              On the App Store for iPhone, iPad, and Mac.
            </p>
          )}
          {links?.available === false && (
            <div className={styles.notice}>
              <p className={styles.noticeTitle}>Coming soon to the App Store</p>
              <p className={styles.noticeBody}>
                The app lands on the App Store soon. Convert your notes on the
                web in the meantime.
              </p>
              <Link to="/" className={sharedStyles.btnPrimary}>
                Convert a deck on the web
              </Link>
            </div>
          )}
        </div>
        <div className={styles.heroArt}>
          <PhoneFrame {...HERO_SHOT} />
        </div>
      </section>

      <section className={styles.formats}>
        <p className={styles.formatsLabel}>
          Converts the files you already have
        </p>
        <div className={styles.formatsRow}>
          {FORMATS.map((f) => (
            <span key={f} className={styles.formatChip}>
              {f}
            </span>
          ))}
        </div>
      </section>

      <section className={styles.features}>
        {FEATURES.map((feature) => (
          <div key={feature.title} className={styles.featureCard}>
            <h2 className={styles.featureTitle}>{feature.title}</h2>
            <p className={styles.featureBody}>{feature.body}</p>
          </div>
        ))}
      </section>

      <section className={styles.steps}>
        <h2 className={styles.sectionHeading}>
          From file to deck in three steps
        </h2>
        <div className={styles.stepsRow}>
          {STEPS.map((step) => (
            <div key={step.n} className={styles.stepCard}>
              <span className={styles.stepNumber}>{step.n}</span>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p className={styles.stepBody}>{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.screenshots}>
        <h2 className={styles.sectionHeading}>See it on iPhone and iPad</h2>
        <div className={styles.phoneGallery}>
          {IPHONE_SHOTS.map((shot) => (
            <PhoneFrame key={shot.src} {...shot} />
          ))}
        </div>
        <div className={styles.ipadGallery}>
          {IPAD_SHOTS.map((shot) => (
            <div key={shot.src} className={styles.ipadCard}>
              <img src={shot.src} alt={shot.alt} loading="lazy" />
            </div>
          ))}
        </div>
      </section>

      <section className={styles.faq}>
        <h2 className={styles.sectionHeading}>Common questions</h2>
        <div className={styles.faqList}>
          {FAQS.map((faq) => (
            <details key={faq.q} className={styles.faqItem}>
              <summary className={styles.faqQuestion}>{faq.q}</summary>
              <p className={styles.faqAnswer}>{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className={styles.finalCta}>
        <h2 className={styles.finalTitle}>Start building decks today</h2>
        <p className={styles.finalBody}>
          Free to start — convert your first file in seconds.
        </p>
        {downloadCta('footer')}
        {links?.available === false && (
          <Link to="/" className={sharedStyles.btnPrimary}>
            Convert a deck on the web
          </Link>
        )}
      </section>
    </div>
  );
}
