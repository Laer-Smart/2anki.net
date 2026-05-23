import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ErrorHandlerType } from '../../components/errors/helpers/getErrorMessage';
import useQuery from '../../lib/hooks/useQuery';
import { useUserLocals } from '../../lib/hooks/useUserLocals';
import styles from '../../styles/shared.module.css';
import { ExploreCard } from './components/ExploreCard/ExploreCard';
import { OnboardingTour } from './components/OnboardingTour/OnboardingTour';
import UploadForm from './components/UploadForm/UploadForm';
import pageStyles from './UploadPage.module.css';

const REATTACH_KEY = 'upload_pending_filename';

interface Props {
  setErrorMessage: ErrorHandlerType;
}

export function UploadPage({ setErrorMessage }: Readonly<Props>) {
  const query = useQuery();
  const view = query.get('view');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [reattachFilename, setReattachFilename] = useState<string | null>(() => {
    const stored = globalThis.sessionStorage?.getItem(REATTACH_KEY) ?? null;
    return stored != null && stored.length > 0 ? stored : null;
  });
  const { data: userLocals } = useUserLocals();

  useEffect(() => {
    if (searchParams.get('from') === 'pass') {
      const next = new URLSearchParams(searchParams);
      next.delete('from');
      const qs = next.toString();
      navigate(qs ? `/upload?${qs}` : '/upload', { replace: true });
    }
  }, [searchParams, navigate]);

  if (
    view === 'template' ||
    view === 'deck-options' ||
    view === 'card-options'
  ) {
    return <Navigate to="/card-options" replace />;
  }

  return (
    <div className={styles.page}>
      <Helmet>
        <title>Upload — 2anki</title>
      </Helmet>
      <header className={styles.pageHeaderCenter}>
        <h1 className={styles.title}>Convert your notes</h1>
        <p className={styles.subtitle}>
          One deck per file — PDF, Notion export, Word, Markdown, HTML, Excel, CSV, or PowerPoint
        </p>
      </header>
      <OnboardingTour
        createdAt={userLocals?.user?.created_at ?? null}
        onboardedAt={userLocals?.user?.onboarded_at ?? null}
      />
      {reattachFilename != null && (
        <div className={pageStyles.reattachBanner} role="status">
          <span>Re-attach </span>
          <strong>{reattachFilename}</strong>
          <span> to convert</span>
        </div>
      )}
      <UploadForm setErrorMessage={setErrorMessage} />
      <ExploreCard />
      <section className={pageStyles.howItWorks}>
        <h2 className={pageStyles.howItWorksHeading}>How it works</h2>
        <p className={pageStyles.footnote}>
          Your uploaded files are deleted after 2 hours.
        </p>
        <div className={pageStyles.steps}>
          <div className={pageStyles.step}>
            <span className={pageStyles.stepNumber}>1</span>
            <div>
              <p className={pageStyles.stepTitle}>Drop or choose a file</p>
              <p className={pageStyles.stepBody}>
                PDF, Word, Markdown, HTML, Excel, PowerPoint, CSV — or a Notion export.
              </p>
              <p className={pageStyles.stepBody}>
                Doc and docx: use headings for the front of each card, body text for the back. Plain paragraphs become separate cards.
              </p>
              <p className={pageStyles.stepBody}>
                Coming from Notion?{' '}
                <a href="/documentation/start-here/upload-a-file">
                  How to export your pages.
                </a>
              </p>
            </div>
          </div>
          <div className={pageStyles.step}>
            <span className={pageStyles.stepNumber}>2</span>
            <div>
              <p className={pageStyles.stepTitle}>We build your deck</p>
              <p className={pageStyles.stepBody}>
                Images, code blocks, cloze deletions, and formatting all transfer.
                Usually takes a few seconds.
              </p>
            </div>
          </div>
          <div className={pageStyles.step}>
            <span className={pageStyles.stepNumber}>3</span>
            <div>
              <p className={pageStyles.stepTitle}>Open in Anki</p>
              <p className={pageStyles.stepBody}>
                Your .apkg downloads automatically. Import it into Anki or
                AnkiDroid and start studying.
              </p>
            </div>
          </div>
        </div>
      </section>
      <section className={pageStyles.contactNudge} aria-label="Contact us">
        <p>
          Bug, feature request, or a file that won&apos;t convert?{' '}
          <Link to="/contact">Tell us</Link> or email{' '}
          <a href="mailto:support@2anki.net">support@2anki.net</a>.
        </p>
      </section>
    </div>
  );
}
