import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
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

interface CompletedNoticeProps {
  truncated: boolean;
  imported: number;
  totalNotes: number;
  pageTitle: string;
}

function CompletedNotice({
  truncated,
  imported,
  totalNotes,
  pageTitle,
}: Readonly<CompletedNoticeProps>) {
  const { t } = useTranslation('tools');
  if (truncated) {
    return <>{t('import.completedTruncated', { imported, totalNotes })}</>;
  }
  return (
    <>
      {pageTitle
        ? t('import.completedToPage', { imported, pageTitle })
        : t('import.completedToDefault', { imported })}
    </>
  );
}

export default function ImportPage({ setError }: Readonly<ImportPageProps>) {
  const { t } = useTranslation('tools');
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
          <h1 className={sharedStyles.title}>{t('import.title')}</h1>
          <p className={sharedStyles.subtitle}>{t('import.connectSubtitle')}</p>
        </div>
        <div className={styles.connectCta}>
          <a href="/notion" className={sharedStyles.btnPrimary}>
            {t('import.connectCta')}
          </a>
          <p className={styles.connectPrivacy}>{t('import.connectPrivacy')}</p>
        </div>
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className={sharedStyles.page}>
        <div className={sharedStyles.pageHeader}>
          <h1 className={sharedStyles.title}>{t('import.title')}</h1>
        </div>
        <div className={sharedStyles.notificationSuccess}>
          <CompletedNotice
            truncated={job.truncated}
            imported={job.progress.imported}
            totalNotes={job.progress.total_notes}
            pageTitle={selectedPageTitle}
          />
        </div>
        <div className={styles.completeActions}>
          {job.notionPageUrl && (
            <a
              href={job.notionPageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`${sharedStyles.btnPrimary} ${sharedStyles.btnInline}`}
            >
              {t('import.openInNotion')}
            </a>
          )}
          <button
            type="button"
            className={`${sharedStyles.btnSecondary} ${sharedStyles.btnInline}`}
            onClick={handleReset}
          >
            {t('import.importAnother')}
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
          <h1 className={sharedStyles.title}>{t('import.title')}</h1>
        </div>
        <div className={sharedStyles.notificationDanger}>
          {isUpgradeError && job.errorMessage}
          {partialProgress &&
            t('import.partialProgress', {
              imported: job.progress.imported,
              totalNotes: job.progress.total_notes,
            })}
          {!isUpgradeError &&
            !partialProgress &&
            (job.errorMessage ?? t('import.genericError'))}
        </div>
        <div className={styles.errorActions}>
          {isUpgradeError ? (
            <Link
              to="/pricing"
              className={`${sharedStyles.btnPrimary} ${sharedStyles.btnInline}`}
            >
              {t('import.viewPlans')}
            </Link>
          ) : (
            <button
              type="button"
              className={`${sharedStyles.btnPrimary} ${sharedStyles.btnInline}`}
              onClick={handleReset}
            >
              {t('import.tryAgain')}
            </button>
          )}
          <button
            type="button"
            className={`${sharedStyles.btnSecondary} ${sharedStyles.btnInline}`}
            onClick={handleReset}
          >
            {isUpgradeError
              ? t('import.trySmallerDeck')
              : t('import.startOver')}
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
        <h1 className={sharedStyles.title}>{t('import.title')}</h1>
        <p className={sharedStyles.subtitle}>{t('import.subtitle')}</p>
      </div>

      {!paying && (
        <div className={sharedStyles.notificationWarning}>
          {t('import.freePlanNotice')}{' '}
          <Link to="/pricing">{t('import.upgradeUnlimitedImports')}</Link>
        </div>
      )}

      <div className={styles.stepCard}>
        <div className={styles.stepCardHeader}>
          <span className={styles.stepNumber}>1</span>
          <p className={styles.stepTitle}>{t('import.step1')}</p>
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
          <p className={styles.stepTitle}>{t('import.step2')}</p>
        </div>

        <div className={styles.destinationGroup}>
          <div className={styles.quickImportBlock}>
            <button
              type="button"
              className={sharedStyles.btnPrimary}
              disabled={file == null || isRunning}
              onClick={handleQuickImport}
            >
              {t('import.quickImport')}
            </button>
            <p className={styles.quickImportHelp}>
              {t('import.quickImportHelp')}
            </p>
          </div>

          <div className={styles.quickImportDivider}>
            <span className={styles.quickImportDividerText}>
              {t('import.orChoosePage')}
            </span>
          </div>

          <div className={styles.pagePickerBlock}>
            <NotionPagePicker
              selectedPageId={selectedPageId}
              onPageSelected={handlePageSelected}
              disabled={file == null || isRunning}
            />
            <p className={styles.pagePickerHelp}>
              {t('import.pagePickerHelp')}
            </p>
            <div className={styles.pagePickerActions}>
              <button
                type="button"
                className={sharedStyles.btnOutline}
                disabled={file == null || selectedPageId == null || isRunning}
                onClick={handleStartImport}
              >
                {t('import.importToSelected')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
