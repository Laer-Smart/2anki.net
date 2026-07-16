import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import sharedStyles from '../../../styles/shared.module.css';
import styles from '../AnkifyPage.module.css';
import { get2ankiApi } from '../../../lib/backend/get2ankiApi';
import { Backend, TrackerSchemaError } from '../../../lib/backend/Backend';
import NotionDatabasePicker, {
  NotionDatabaseOption,
} from './NotionDatabasePicker';
import TrackerParentPicker from './TrackerParentPicker';
import NotionObject from '../../../lib/interfaces/NotionObject';

interface Props {
  readonly backend?: Backend;
}

const SUBSCRIPTIONS_KEY = ['ankify-subscriptions'];
const TRACKER_LOCAL_KEY = 'ankify-export-database-id';
const TRACKER_TITLE_LOCAL_KEY = 'ankify-export-database-title';
const TRACKER_URL_LOCAL_KEY = 'ankify-export-database-url';

type WizardStep = 'idle' | 'pickParent' | 'confirm';

const readLocal = (key: string): string => {
  try {
    return globalThis.localStorage?.getItem(key) ?? '';
  } catch {
    return '';
  }
};

const writeLocal = (key: string, value: string) => {
  try {
    globalThis.localStorage?.setItem(key, value);
  } catch {
    /* ignore */
  }
};

export default function ReviewDataExport({ backend }: Props) {
  const { t } = useTranslation('ankify');
  const api = backend ?? get2ankiApi();
  const queryClient = useQueryClient();

  const [databaseId, setDatabaseId] = useState(() =>
    readLocal(TRACKER_LOCAL_KEY)
  );
  const [trackerTitle, setTrackerTitle] = useState(() =>
    readLocal(TRACKER_TITLE_LOCAL_KEY)
  );
  const [trackerUrl, setTrackerUrl] = useState(() =>
    readLocal(TRACKER_URL_LOCAL_KEY)
  );
  const [dateRangeDays, setDateRangeDays] = useState('');
  const [wizard, setWizard] = useState<WizardStep>('idle');
  const [pendingParent, setPendingParent] = useState<NotionObject | null>(null);
  const [showAllErrors, setShowAllErrors] = useState(false);
  const [showChange, setShowChange] = useState(false);

  const subsQuery = useQuery({
    queryKey: SUBSCRIPTIONS_KEY,
    queryFn: () => api.listAnkifySubscriptions(),
  });

  useEffect(() => {
    if (databaseId.length > 0) {
      writeLocal(TRACKER_LOCAL_KEY, databaseId);
    }
  }, [databaseId]);

  const exportMutation = useMutation({
    mutationFn: () =>
      api.exportAnkifyReviewData({
        databaseId: databaseId.trim(),
        dateRangeDays:
          dateRangeDays.trim().length > 0 ? Number(dateRangeDays) : undefined,
      }),
    onSuccess: () => setShowAllErrors(false),
  });

  const createTracker = useMutation({
    mutationFn: (parentPageId: string) =>
      api.createAnkifyReviewTracker({ parentPageId }),
    onSuccess: (created) => {
      setDatabaseId(created.id);
      setTrackerTitle(created.title);
      setTrackerUrl(created.url ?? '');
      writeLocal(TRACKER_LOCAL_KEY, created.id);
      writeLocal(TRACKER_TITLE_LOCAL_KEY, created.title);
      writeLocal(TRACKER_URL_LOCAL_KEY, created.url ?? '');
      queryClient.invalidateQueries({ queryKey: ['ankify-notion-databases'] });
      setWizard('idle');
      setPendingParent(null);
      setShowChange(false);
    },
    onError: () => setWizard('confirm'),
  });

  const hasTracker = databaseId.trim().length > 0;
  const suggestedParentId =
    subsQuery.data != null && subsQuery.data.length > 0
      ? subsQuery.data[0].notion_page_id
      : null;

  const startWizard = () => {
    setWizard('pickParent');
    setPendingParent(null);
  };

  const result = exportMutation.data;
  const errorList = result?.errors ?? [];
  const visibleErrors = showAllErrors ? errorList : errorList.slice(0, 3);
  const allFailed =
    result != null && result.totalDays > 0 && result.exported === 0;
  const looksLikeMissingProperty = errorList.some((line) =>
    /property|date|reviews|schema/i.test(line)
  );

  const firstRunLead = t('export.firstRunLead');
  const heading = t('export.heading');
  const lead = t('export.lead');

  const handlePickerChange = (id: string, picked?: NotionDatabaseOption) => {
    setDatabaseId(id);
    const nextTitle = picked?.title ?? '';
    const nextUrl = picked?.url ?? '';
    setTrackerTitle(nextTitle);
    setTrackerUrl(nextUrl);
    writeLocal(TRACKER_TITLE_LOCAL_KEY, nextTitle);
    writeLocal(TRACKER_URL_LOCAL_KEY, nextUrl);
  };

  const renderTrackerSummaryName = () => {
    if (trackerUrl.length > 0) {
      return (
        <a
          href={trackerUrl}
          target="_blank"
          rel="noreferrer"
          className={styles.trackerSummaryLink}
        >
          {trackerTitle.length > 0 ? trackerTitle : t('export.savedTracker')}
        </a>
      );
    }
    if (trackerTitle.length > 0) {
      return trackerTitle;
    }
    return t('export.savedTracker');
  };

  const renderResultSummary = () => {
    if (!exportMutation.isSuccess || result == null) {
      return null;
    }
    return (
      <div className={styles.resultBlock}>
        <p
          className={
            allFailed ? sharedStyles.helpDanger : sharedStyles.helpSuccess
          }
        >
          {allFailed
            ? t('export.allFailed', { count: result.totalDays })
            : t('export.updatedDays', { count: result.exported })}
          {!allFailed && result.skipped > 0
            ? t('export.skipped', { count: result.skipped })
            : ''}
          {!allFailed && errorList.length > 0
            ? t('export.someFailed', { count: errorList.length })
            : ''}
          .
        </p>

        {allFailed && looksLikeMissingProperty && (
          <div className={styles.shapeWarning}>
            <p className={styles.shapeWarningText}>
              {t('export.missingColumns')}
            </p>
            <button
              type="button"
              className={`${sharedStyles.btnPrimary} ${styles.inlineButton}`}
              onClick={startWizard}
            >
              {t('export.makeFresh')}
            </button>
          </div>
        )}

        {errorList.length > 0 && (
          <div className={styles.errorListBlock}>
            <p className={styles.errorListHeading}>
              {t('export.whatWentWrong')}
            </p>
            <ul className={styles.errorList}>
              {visibleErrors.map((line) => (
                <li key={line} className={styles.errorListItem}>
                  {line}
                </li>
              ))}
            </ul>
            {errorList.length > visibleErrors.length && (
              <button
                type="button"
                className={`${sharedStyles.btnSmall} ${styles.inlineButton}`}
                onClick={() => setShowAllErrors(true)}
              >
                {t('export.showAll', { count: errorList.length })}
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderExportError = () => {
    if (!exportMutation.isError) {
      return null;
    }
    if (exportMutation.error instanceof TrackerSchemaError) {
      return (
        <div className={styles.shapeWarning} role="alert">
          <p className={styles.shapeWarningText}>
            {t('export.missingColumns')}
          </p>
          <button
            type="button"
            className={`${sharedStyles.btnPrimary} ${styles.inlineButton}`}
            onClick={startWizard}
          >
            {t('export.makeFresh')}
          </button>
        </div>
      );
    }
    return (
      <p role="alert" className={sharedStyles.helpDanger}>
        {t('export.updateError', {
          error: (exportMutation.error as Error).message,
        })}
      </p>
    );
  };

  const renderFirstRunBlock = () => (
    <div className={styles.firstRunBlock}>
      <button
        type="button"
        className={`${sharedStyles.btnPrimary} ${styles.inlineButton}`}
        onClick={startWizard}
      >
        {t('export.createTracker')}
      </button>
      <hr className={sharedStyles.surfaceDivider} />
      <details>
        <summary className={styles.advancedSummary}>
          {t('export.alreadyHaveOne')}
        </summary>
        <div className={styles.advancedBody}>
          <NotionDatabasePicker
            backend={api}
            value={databaseId}
            onChange={handlePickerChange}
            onWantToCreate={startWizard}
          />
        </div>
      </details>
    </div>
  );

  const renderTrackerSummary = () => (
    <div className={styles.trackerSummary}>
      <div className={styles.trackerSummaryHead}>
        <div>
          <p className={styles.trackerSummaryLabel}>{t('export.sendingTo')}</p>
          <p className={styles.trackerSummaryName}>
            {renderTrackerSummaryName()}
          </p>
        </div>
        <button
          type="button"
          className={styles.btnLink}
          onClick={() => setShowChange((current) => !current)}
        >
          {showChange ? t('export.done') : t('export.change')}
        </button>
      </div>

      {showChange && (
        <div className={styles.changeBlock}>
          <NotionDatabasePicker
            backend={api}
            value={databaseId}
            onChange={handlePickerChange}
            onWantToCreate={() => {
              setShowChange(false);
              startWizard();
            }}
          />
          <button
            type="button"
            className={`${sharedStyles.btnSmall} ${styles.inlineButton}`}
            onClick={startWizard}
          >
            {t('export.orMakeFresh')}
          </button>
        </div>
      )}

      <form
        className={styles.sendRow}
        onSubmit={(event) => {
          event.preventDefault();
          if (databaseId.trim().length > 0) {
            exportMutation.mutate();
          }
        }}
      >
        <div className={styles.dateRangeField}>
          <label htmlFor="ankify-date-range">{t('export.daysBack')}</label>
          <input
            id="ankify-date-range"
            type="number"
            min={1}
            value={dateRangeDays}
            onChange={(event) => setDateRangeDays(event.target.value)}
            placeholder={t('export.allTime')}
          />
        </div>
        <button
          type="submit"
          className={`${sharedStyles.btnPrimary} ${styles.inlineButton}`}
          disabled={exportMutation.isPending}
        >
          {exportMutation.isPending
            ? t('export.updating')
            : t('export.updateNotion')}
        </button>
      </form>

      <p className={styles.trustNote}>{t('export.trustNote')}</p>

      {renderResultSummary()}
      {renderExportError()}
    </div>
  );

  const renderConfirmStep = () => {
    if (wizard !== 'confirm' || pendingParent == null) {
      return null;
    }
    return (
      <div className={styles.trackerStep}>
        <p className={styles.trackerStepLabel}>{t('export.step2Label')}</p>
        <h4 className={styles.trackerStepTitle}>
          {t('export.confirmTitle', { title: pendingParent.title })}
        </h4>
        <p className={styles.trackerStepHint}>{t('export.confirmHint')}</p>
        {createTracker.isError && (
          <p role="alert" className={sharedStyles.helpDanger}>
            {t('export.createError', {
              error: (createTracker.error as Error).message,
            })}
          </p>
        )}
        <div className={styles.trackerStepActions}>
          <button
            type="button"
            className={`${sharedStyles.btnSecondary} ${styles.inlineButton}`}
            onClick={() => setWizard('pickParent')}
            disabled={createTracker.isPending}
          >
            {t('export.back')}
          </button>
          <button
            type="button"
            className={`${sharedStyles.btnPrimary} ${styles.inlineButton}`}
            onClick={() => createTracker.mutate(pendingParent.id)}
            disabled={createTracker.isPending}
          >
            {createTracker.isPending
              ? t('export.creating')
              : t('export.createMyTracker')}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div>
      <header className={sharedStyles.surfaceHeader}>
        <div className={sharedStyles.surfaceHeaderText}>
          <h2 className={sharedStyles.surfaceTitle}>{heading}</h2>
          <p className={sharedStyles.surfaceLead}>
            {!hasTracker && wizard === 'idle' ? firstRunLead : lead}
          </p>
        </div>
      </header>

      {!hasTracker && wizard === 'idle' && renderFirstRunBlock()}
      {hasTracker && wizard === 'idle' && renderTrackerSummary()}

      {wizard === 'pickParent' && (
        <TrackerParentPicker
          backend={api}
          suggestedPageId={suggestedParentId}
          busy={false}
          onConfirm={(page) => {
            setPendingParent(page);
            setWizard('confirm');
          }}
          onCancel={() => {
            setWizard('idle');
            setPendingParent(null);
          }}
        />
      )}

      {renderConfirmStep()}
    </div>
  );
}
