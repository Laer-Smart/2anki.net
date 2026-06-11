import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';

import sharedStyles from '../../styles/shared.module.css';
import styles from './ImportPage.module.css';
import ApkgDropZone from './components/ApkgDropZone';
import NotionPagePicker from './components/NotionPagePicker';
import ImportProgress from './components/ImportProgress';
import useImportJob from './hooks/useImportJob';
import useNotionData from '../SearchPage/helpers/useNotionData';
import { get2ankiApi } from '../../lib/backend/get2ankiApi';
import { useUserLocals } from '../../lib/hooks/useUserLocals';
import { isPayingUser } from '../../components/NavigationBar/helpers/getPlanLabel';

interface ImportPageProps {
  setError: (error: unknown) => void;
}

export default function ImportPage({ setError }: Readonly<ImportPageProps>) {
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [selectedPageTitle, setSelectedPageTitle] = useState<string>('');
  const notionData = useNotionData(get2ankiApi());
  const { data: userLocals } = useUserLocals();
  const paying = isPayingUser(userLocals?.locals);
  const job = useImportJob();

  const isConnected = notionData.connected === true;
  const isUploading = job.phase === 'uploading';
  const isPolling = job.phase === 'polling';
  const isCompleted = job.phase === 'completed';
  const isFailed = job.phase === 'failed';
  const isRunning = isUploading || isPolling;

  const handleFileSelected = useCallback((f: File) => {
    setFile(f);
    setFileError(null);
  }, []);

  const handleFileRejected = useCallback((message: string) => {
    setFileError(message);
  }, []);

  const handlePageSelected = useCallback(
    (pageId: string, pageTitle: string) => {
      setSelectedPageId(pageId);
      setSelectedPageTitle(pageTitle);
    },
    []
  );

  const handleStartImport = useCallback(async () => {
    if (file == null || selectedPageId == null) return;
    try {
      await job.submit(file, selectedPageId);
    } catch (err) {
      setError(err);
    }
  }, [file, selectedPageId, job, setError]);

  const handleQuickImport = useCallback(async () => {
    if (file == null) return;
    try {
      await job.submit(file);
    } catch (err) {
      setError(err);
    }
  }, [file, job, setError]);

  const handleReset = useCallback(() => {
    job.reset();
    setFile(null);
    setFileError(null);
    setSelectedPageId(null);
    setSelectedPageTitle('');
  }, [job]);

  if (notionData.loading) {
    return (
      <div className={sharedStyles.page}>
        <div className={sharedStyles.flexCenter}>
          <div className={sharedStyles.spinnerSmall} />
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className={sharedStyles.page}>
        <div className={sharedStyles.pageHeader}>
          <h1 className={sharedStyles.title}>Import to Notion</h1>
          <p className={sharedStyles.subtitle}>
            Connect Notion to import Anki decks into your workspace.
          </p>
        </div>
        <div className={styles.connectCta}>
          <a href="/notion" className={sharedStyles.btnPrimary}>
            Connect to Notion
          </a>
          <p className={styles.connectPrivacy}>
            2anki only creates pages where you choose. It does not read or
            change your existing Notion content.
          </p>
        </div>
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className={sharedStyles.page}>
        <div className={sharedStyles.pageHeader}>
          <h1 className={sharedStyles.title}>Import to Notion</h1>
        </div>
        <div className={sharedStyles.notificationSuccess}>
          {job.truncated ? (
            <>
              Imported {job.progress.imported} of {job.progress.total_notes}{' '}
              notes — import limit reached. See the note at the top of your
              Notion page.
            </>
          ) : (
            <>
              {job.progress.imported} notes added
              {selectedPageTitle ? (
                <> to &ldquo;{selectedPageTitle}&rdquo;</>
              ) : (
                <> to your &ldquo;2anki Imports&rdquo; page</>
              )}
            </>
          )}
        </div>
        <div className={styles.completeActions}>
          {job.notionPageUrl && (
            <a
              href={job.notionPageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`${sharedStyles.btnPrimary} ${sharedStyles.btnInline}`}
            >
              Open in Notion
            </a>
          )}
          <button
            type="button"
            className={`${sharedStyles.btnSecondary} ${sharedStyles.btnInline}`}
            onClick={handleReset}
          >
            Import another deck
          </button>
        </div>
      </div>
    );
  }

  if (isFailed) {
    const isUpgradeError =
      job.errorMessage?.includes('Upgrade') ||
      job.errorMessage?.includes('Free plan');
    const partialProgress =
      !isUpgradeError &&
      job.progress.total_notes > 0 &&
      job.errorMessage == null;
    return (
      <div className={sharedStyles.page}>
        <div className={sharedStyles.pageHeader}>
          <h1 className={sharedStyles.title}>Import to Notion</h1>
        </div>
        <div className={sharedStyles.notificationDanger}>
          {isUpgradeError && job.errorMessage}
          {partialProgress &&
            `Imported ${job.progress.imported} of ${job.progress.total_notes} notes before something went wrong. The notes already created are still in your Notion page.`}
          {!isUpgradeError &&
            !partialProgress &&
            (job.errorMessage ?? 'Something went wrong.')}
        </div>
        <div className={styles.errorActions}>
          {isUpgradeError ? (
            <Link
              to="/pricing"
              className={`${sharedStyles.btnPrimary} ${sharedStyles.btnInline}`}
            >
              View plans
            </Link>
          ) : (
            <button
              type="button"
              className={`${sharedStyles.btnPrimary} ${sharedStyles.btnInline}`}
              onClick={handleReset}
            >
              Try again
            </button>
          )}
          <button
            type="button"
            className={`${sharedStyles.btnSecondary} ${sharedStyles.btnInline}`}
            onClick={handleReset}
          >
            {isUpgradeError ? 'Try a smaller deck' : 'Start over'}
          </button>
        </div>
      </div>
    );
  }

  if (isRunning) {
    return (
      <div className={sharedStyles.page}>
        <ImportProgress
          imported={job.progress.imported}
          total={job.progress.total_notes}
          fileName={file?.name ?? ''}
          pageTitle={selectedPageTitle || '2anki Imports'}
          statusText={job.statusText}
        />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={sharedStyles.pageHeader}>
        <h1 className={sharedStyles.title}>Import to Notion</h1>
        <p className={sharedStyles.subtitle}>
          Turn an Anki deck into Notion toggle pages.
        </p>
      </div>

      {!paying && (
        <div className={sharedStyles.notificationWarning}>
          Free plan · up to 1 000 cards per import.{' '}
          <Link to="/pricing">Upgrade for unlimited imports</Link>
        </div>
      )}

      <div className={styles.stepCard}>
        <div className={styles.stepCardHeader}>
          <span className={styles.stepNumber}>1</span>
          <p className={styles.stepTitle}>Choose your Anki deck</p>
        </div>
        <ApkgDropZone
          file={file}
          onFileSelected={handleFileSelected}
          onFileRejected={handleFileRejected}
          disabled={isRunning}
        />
        {fileError && <p className={styles.dropZoneError}>{fileError}</p>}
      </div>

      <div
        className={`${styles.stepCard} ${file == null ? styles.stepCardDisabled : ''}`}
      >
        <div className={styles.stepCardHeader}>
          <span className={styles.stepNumber}>2</span>
          <p className={styles.stepTitle}>Pick a destination</p>
        </div>

        <div className={styles.destinationGroup}>
          <div className={styles.quickImportBlock}>
            <button
              type="button"
              className={sharedStyles.btnPrimary}
              disabled={file == null || isRunning}
              onClick={handleQuickImport}
            >
              Quick import
            </button>
            <p className={styles.quickImportHelp}>
              Creates a &ldquo;2anki Imports&rdquo; page in your Notion
              workspace
            </p>
          </div>

          <div className={styles.quickImportDivider}>
            <span className={styles.quickImportDividerText}>
              or choose a page
            </span>
          </div>

          <div className={styles.pagePickerBlock}>
            <NotionPagePicker
              selectedPageId={selectedPageId}
              onPageSelected={handlePageSelected}
              disabled={file == null || isRunning}
            />
            <p className={styles.pagePickerHelp}>
              Showing top-level pages shared with 2anki. Missing a page? Check
              your Notion sharing settings.
            </p>
            <div className={styles.pagePickerActions}>
              <button
                type="button"
                className={sharedStyles.btnOutline}
                disabled={file == null || selectedPageId == null || isRunning}
                onClick={handleStartImport}
              >
                Import to selected page
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
