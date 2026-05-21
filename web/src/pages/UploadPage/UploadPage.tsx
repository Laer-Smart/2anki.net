import {
  useQueryClient,
  useQuery as useReactQuery,
} from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ErrorHandlerType } from '../../components/errors/helpers/getErrorMessage';
import { UpsellCard } from '../../components/UpsellCard';
import {
  dismissUploadPrimer,
  fetchUserPreferences,
  type ServerUserPreferences,
} from '../../lib/data_layer/userPreferencesSync';
import useQuery from '../../lib/hooks/useQuery';
import { useUserLocals } from '../../lib/hooks/useUserLocals';
import { getVisibleText } from '../../lib/text/getVisibleText';
import styles from '../../styles/shared.module.css';
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
  const queryClient = useQueryClient();
  const [reattachFilename, setReattachFilename] = useState<string | null>(() => {
    const stored = globalThis.sessionStorage?.getItem(REATTACH_KEY) ?? null;
    return stored != null && stored.length > 0 ? stored : null;
  });
  const { data: userLocals } = useUserLocals();

  const prefsQuery = useReactQuery({
    queryKey: ['user-preferences'],
    queryFn: fetchUserPreferences,
    staleTime: 60_000,
    retry: false,
  });

  // Server is the only source of truth. Until the query resolves, hide the primer rather
  // than flash it — a brief delay before showing orientation copy is better than briefly
  // showing it to someone who has already dismissed it.
  const primerVisible =
    prefsQuery.isFetched && prefsQuery.data?.uploadPrimerDismissedAt == null;

  useEffect(() => {
    if (searchParams.get('from') === 'pass') {
      const next = new URLSearchParams(searchParams);
      next.delete('from');
      const qs = next.toString();
      navigate(qs ? `/upload?${qs}` : '/upload', { replace: true });
    }
  }, [searchParams, navigate]);

  const handleDismissPrimer = () => {
    const now = new Date().toISOString();
    queryClient.setQueryData<ServerUserPreferences | null>(
      ['user-preferences'],
      (current) => ({
        cardOptions: current?.cardOptions ?? null,
        theme: current?.theme ?? null,
        ankiWebAcknowledgedAt: current?.ankiWebAcknowledgedAt ?? null,
        uploadPrimerDismissedAt: now,
      })
    );
    void dismissUploadPrimer();
  };

  if (
    view === 'template' ||
    view === 'deck-options' ||
    view === 'card-options'
  ) {
    return <Navigate to="/card-options" replace />;
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <h1 className={styles.title}>{getVisibleText('upload.page.title')}</h1>
        <p className={styles.subtitle}>
          Turn your notes into flashcards in seconds
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
      {primerVisible && (
        <section className={pageStyles.primer} aria-label="How 2anki works">
          <button
            type="button"
            className={pageStyles.primerDismiss}
            onClick={handleDismissPrimer}
            aria-label="Dismiss tips"
          >
            ✕
          </button>
          <p className={pageStyles.primerHeading}>
            How cards are made
          </p>
          <p className={pageStyles.primerBody}>
            Drop a file — PDF, Word doc, Markdown, HTML, or a Notion export.
            2anki finds the structure in your notes and builds one card per
            question or toggle. Usually done in a few seconds.
          </p>
          <a
            href="/documentation/start-here/upload-a-file"
            className={pageStyles.primerLink}
          >
            See what formats work
          </a>
        </section>
      )}
      <UploadForm setErrorMessage={setErrorMessage} />
      <div className={pageStyles.upsellWrapper}>
        <UpsellCard surface="upload_idle_upsell" hideForAnonymous />
      </div>
      <details className={pageStyles.howItWorks}>
        <summary className={pageStyles.howItWorksSummary}>How it works</summary>
        <p className={pageStyles.footnote}>
          Your uploaded files are deleted after 2 hours.
        </p>
        <p className={pageStyles.settingsHint}>
          Change deck names, templates, and conversion defaults in{' '}
          <Link to="/card-options?returnTo=/upload">Settings</Link>.
        </p>
        <div className={pageStyles.steps}>
          <div className={pageStyles.step}>
            <span className={pageStyles.stepNumber}>1</span>
            <div>
              <p className={pageStyles.stepTitle}>Drop or choose a file</p>
              <p className={pageStyles.stepBody}>
                Notion export, PDF, HTML, Markdown, Word, Excel, PowerPoint, or
                CSV.{' '}
                <a href="/documentation/start-here/upload-a-file">
                  How to export from Notion
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
      </details>
    </div>
  );
}
