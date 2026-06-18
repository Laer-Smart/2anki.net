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
  'Convert your notes and files into Anki decks on iPhone, iPad, and Mac. Markdown, PDF, Notion, CSV, OPML, Kindle — parsed on your device. Free on the App Store.';

const FORMATS = [
  'Markdown',
  'PDF',
  'Notion',
  'CSV',
  'OPML',
  'Kindle',
  '.apkg',
];

const FEATURES = [
  {
    icon: '🔒',
    title: 'Parsed on your device',
    body: 'Your files never leave your Mac, iPhone, or iPad to become cards. Markdown, PDFs, and exports are converted locally — private by default.',
  },
  {
    icon: '✨',
    title: 'Build decks with AI chat',
    body: 'Paste a topic or a wall of notes and let chat draft the cards. Preview every front and back before anything reaches Anki.',
  },
  {
    icon: '📦',
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
    a: 'It is a universal app — one download covers iPhone, iPad, and Mac with the same on-device conversion.',
  },
];

function PhoneMockup() {
  return (
    <div className={styles.phone} aria-hidden="true">
      <div className={styles.phoneNotch} />
      <div className={styles.phoneScreen}>
        <div className={styles.mockHeader}>
          <span className={styles.mockHeaderTitle}>Make flashcards</span>
        </div>
        <div className={styles.mockCard}>
          <span className={styles.mockChip}>Basic</span>
          <p className={styles.mockFront}>What is spaced repetition?</p>
          <div className={styles.mockRule} />
          <p className={styles.mockBack}>
            Reviewing material at increasing intervals to fight forgetting.
          </p>
        </div>
        <div className={styles.mockCardSlim}>
          <span className={styles.mockChip}>Cloze</span>
          <p className={styles.mockFront}>
            The mitochondria is the {'{{c1::powerhouse}}'} of the cell.
          </p>
        </div>
        <div className={styles.mockCta}>Export deck</div>
      </div>
    </div>
  );
}

function MacMockup() {
  return (
    <div className={styles.mac} aria-hidden="true">
      <div className={styles.macBar}>
        <span className={styles.macDot} />
        <span className={styles.macDot} />
        <span className={styles.macDot} />
        <span className={styles.macBarTitle}>My Decks</span>
      </div>
      <div className={styles.macBody}>
        <div className={styles.macSidebar}>
          <span className={styles.macNavActive}>Make flashcards</span>
          <span className={styles.macNav}>My Decks</span>
          <span className={styles.macNav}>Chat</span>
          <span className={styles.macNav}>Notion</span>
          <span className={styles.macNav}>Account</span>
        </div>
        <div className={styles.macContent}>
          <div className={styles.macRow}>
            <span className={styles.macRowName}>Biology — Chapter 4</span>
            <span className={styles.macRowMeta}>128 cards</span>
          </div>
          <div className={styles.macRow}>
            <span className={styles.macRowName}>Spanish verbs</span>
            <span className={styles.macRowMeta}>64 cards</span>
          </div>
          <div className={styles.macRow}>
            <span className={styles.macRowName}>Kindle — Atomic Habits</span>
            <span className={styles.macRowMeta}>41 cards</span>
          </div>
          <div className={styles.macRow}>
            <span className={styles.macRowName}>USMLE lecture slides</span>
            <span className={styles.macRowMeta}>210 cards</span>
          </div>
        </div>
      </div>
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
          href={links.iosUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() =>
            track('native_app_store_clicked', { store: 'ios', placement })
          }
        >
          <img src="/badges/app-store.svg" alt="Download on the App Store" />
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
            Also on the Mac App Store →
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
              Free on the App Store — iPhone, iPad, and Mac.
            </p>
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
        <div className={styles.heroArt}>
          <PhoneMockup />
        </div>
      </section>

      <section className={styles.formats}>
        <p className={styles.formatsLabel}>Converts the files you already have</p>
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
            <span className={styles.featureIcon} aria-hidden="true">
              {feature.icon}
            </span>
            <h2 className={styles.featureTitle}>{feature.title}</h2>
            <p className={styles.featureBody}>{feature.body}</p>
          </div>
        ))}
      </section>

      <section className={styles.steps}>
        <h2 className={styles.sectionHeading}>From file to deck in three steps</h2>
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

      <section className={styles.showcase}>
        <div className={styles.showcaseCopy}>
          <h2 className={styles.sectionHeading}>
            Your whole deck library, on the desktop
          </h2>
          <p className={styles.showcaseBody}>
            Build on your phone on the train, polish on your Mac at the desk.
            The same on-device engine, the same decks, everywhere you study.
          </p>
        </div>
        <div className={styles.showcaseArt}>
          <MacMockup />
        </div>
      </section>

      <section className={styles.faq}>
        <h2 className={styles.sectionHeading}>Questions</h2>
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
          Free to download. Convert your first file in seconds.
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
