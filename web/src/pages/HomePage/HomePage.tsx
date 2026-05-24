import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import UploadForm from '../UploadPage/components/UploadForm/UploadForm';
import { ErrorHandlerType } from '../../components/errors/helpers/getErrorMessage';
import { useSettingsCardsOptions } from '../../components/modals/SettingsModal/useSettingsCardsOptions';
import ArrowUpTrayIcon from '../../components/icons/ArrowUpTrayIcon';
import SparklesIcon from '../../components/icons/SparklesIcon';
import BookOpenIcon from '../../components/icons/BookOpenIcon';
import { track } from '../../lib/analytics/track';
import { ShowcaseSection } from './ShowcaseSection';
import sharedStyles from '../../styles/shared.module.css';
import styles from './HomePage.module.css';

const FEATURED_WALKTHROUGH_IDS = new Set(['jpR_grXWTTw', 'roQ3awaVa2E', 'UnTo_fN1jpc']);

const MASCOTS = [
  '/mascot/Notion 1.png',
  '/mascot/Notion 2.png',
  '/mascot/Notion 3.png',
  '/mascot/Notion 4.png',
  '/mascot/Notion 5.png',
];

interface HomePageProps {
  setErrorMessage: ErrorHandlerType;
  isLoggedIn: boolean;
}

const STEPS = [
  {
    title: 'Upload',
    body: 'Drop a Notion export, PDF, Markdown, HTML, CSV, Word, or Excel file.',
    Icon: ArrowUpTrayIcon,
  },
  {
    title: 'Convert',
    body: '2anki builds your deck in seconds. Images, audio, code blocks, and cloze deletions all transfer.',
    Icon: SparklesIcon,
  },
  {
    title: 'Study',
    body: 'Open the .apkg file in Anki or AnkiDroid. Your cards are ready to review.',
    Icon: BookOpenIcon,
  },
];

const WALKTHROUGHS: ReadonlyArray<[string, string]> = [
  ['jpR_grXWTTw', 'PDF to Anki in Seconds — No Plugins, No Manual Work'],
  ['roQ3awaVa2E', 'Image Occlusion Comes to 2anki.net — Anatomy Flashcards in Seconds'],
  ['UnTo_fN1jpc', 'How I use Notion to Anki as a medical student'],
  ['NLUfAWA2LJI', 'Turn any website into Anki flashcards'],
  ['r9pPNl8Mx_Q', 'How to use cloze deletions'],
  ['lpC7C9wJoTA', 'Use Notion to Anki for learning languages'],
  ['vINpYLMW9AE', 'Best Notion hack for medical students'],
  ['E51yLIIS3bk', 'Notion2Anki — Perfekter Workflow fürs Lernen'],
  ['57dW_buqtGM', 'Notion to Anki — Tutorial en Español'],
  ['RHReYOKywZc', 'Créer des flashcards Anki avec Notion'],
];

function VideoCard({ embedId, title }: Readonly<{ embedId: string; title: string }>) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <div className={styles.walkCard}>
        <div className={styles.walkVideo}>
          <iframe
            src={`https://www.youtube.com/embed/${embedId}?autoplay=1`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      className={styles.walkCard}
      onClick={() => setPlaying(true)}
      aria-label={`Play: ${title}`}
    >
      <div className={styles.walkThumb}>
        <img
          src={`https://img.youtube.com/vi/${embedId}/hqdefault.jpg`}
          alt={title}
          loading="lazy"
        />
        <span className={styles.walkPlayBtn} aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
      </div>
      <p className={styles.walkCardTitle}>{title}</p>
    </button>
  );
}

export function HomePage({
  setErrorMessage,
  isLoggedIn,
}: Readonly<HomePageProps>) {
  useSettingsCardsOptions(null);
  const mascotSrc = useMemo(
    () => MASCOTS[Math.floor(Math.random() * MASCOTS.length)],
    []
  );
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) track('home_ai_anon_badge_viewed');
  }, [isLoggedIn]);

  if (isLoggedIn) {
    return <Navigate to="/upload" replace />;
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <img
          src={mascotSrc}
          alt=""
          className={styles.mascot}
        />
        <h1 className={styles.heroTitle}>Your notes, ready to study in Anki</h1>
        <p className={styles.heroSubtitle}>
          Upload a Notion export, PDF, Word doc, Markdown file, or Quizlet export. Drop a file to try it — no account needed.
        </p>
        <UploadForm setErrorMessage={setErrorMessage} />
        <div className={styles.heroFooter}>
          <span>Free up to 100 cards per month</span>
          <span className={styles.footerDot} aria-hidden="true" />
          <a
            href="https://github.com/2anki/server"
            target="_blank"
            rel="noreferrer"
            className={styles.githubLink}
          >
            <svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14" aria-hidden="true">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            Open source
          </a>
          <span className={styles.footerDot} aria-hidden="true" />
          <span>
            <span className={sharedStyles.badgePrimary}>AI</span>{' '}
            <Link
              to="/register"
              onClick={() => track('home_ai_anon_badge_clicked')}
            >
              Create an account to turn it on
            </Link>
          </span>
        </div>
      </section>

      <section className={styles.stepsSection}>
        <div className={styles.stepsInner}>
          <p className={styles.stepsHeading}>How it works</p>
          <div className={styles.stepsGrid}>
            {STEPS.map((step) => (
              <div key={step.title} className={styles.step}>
                <span className={styles.stepIcon}>
                  <step.Icon width={22} height={22} />
                </span>
                <p className={styles.stepTitle}>{step.title}</p>
                <p className={styles.stepBody}>{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ShowcaseSection />

      <section id="walkthroughs" className={styles.bottomSection}>
        <p className={styles.walkHeading}>Walkthroughs</p>
        <div className={styles.walkGrid}>
          {(showAll ? WALKTHROUGHS : WALKTHROUGHS.filter(([id]) => FEATURED_WALKTHROUGH_IDS.has(id))).map(([embedId, title]) => (
            <VideoCard
              key={embedId}
              embedId={embedId}
              title={title}
            />
          ))}
          {showAll && (
            <a href="/contact" className={styles.walkCard}>
              <div className={styles.walkCtaThumb}>
                <span className={styles.walkCtaIcon}>+</span>
                <p className={styles.walkCtaBody}>
                  Made a video about 2anki? Contact us and we will feature it
                  here for free.
                </p>
              </div>
              <p className={styles.walkCardTitle}>Submit your video</p>
            </a>
          )}
        </div>
        <div className={styles.walkToggleWrap}>
          <button
            type="button"
            className={styles.walkToggle}
            onClick={() => setShowAll(!showAll)}
            aria-expanded={showAll}
          >
            {showAll ? '▴ Show fewer' : '▾ Show all 10 videos'}
          </button>
        </div>
      </section>
    </div>
  );
}
