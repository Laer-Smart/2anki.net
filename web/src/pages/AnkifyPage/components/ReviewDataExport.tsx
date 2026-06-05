import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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

  const firstRunLead =
    'We\'ll create a Notion database called "Anki review tracker" with three columns: Date, Reviews, Time spent (min). Two short steps.';
  const heading = 'Where does your study history go?';
  const lead =
    "Each day's review count and time spent show up as a row in a Notion database you control.";

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
          {trackerTitle.length > 0 ? trackerTitle : 'Your saved Notion tracker'}
        </a>
      );
    }
    if (trackerTitle.length > 0) {
      return trackerTitle;
    }
    return 'Your saved Notion tracker';
  };

  const renderResultSummary = () => {
    if (!exportMutation.isSuccess || result == null) {
      return null;
    }
    const dayWord = result.exported === 1 ? 'day' : 'days';
    return (
      <div className={styles.resultBlock}>
        <p
          className={
            allFailed ? sharedStyles.helpDanger : sharedStyles.helpSuccess
          }
        >
          {allFailed
            ? `None of your ${result.totalDays} days could be updated.`
            : `Updated Notion. ${result.exported} new ${dayWord}`}
          {!allFailed && result.skipped > 0
            ? `, skipped ${result.skipped}`
            : ''}
          {!allFailed && errorList.length > 0
            ? `, ${errorList.length} couldn't update`
            : ''}
          .
        </p>

        {allFailed && looksLikeMissingProperty && (
          <div className={styles.shapeWarning}>
            <p className={styles.shapeWarningText}>
              This tracker is missing the Date or Reviews column. The fastest
              fix is a fresh tracker — we'll make it.
            </p>
            <button
              type="button"
              className={`${sharedStyles.btnPrimary} ${styles.inlineButton}`}
              onClick={startWizard}
            >
              Make a fresh tracker
            </button>
          </div>
        )}

        {errorList.length > 0 && (
          <div className={styles.errorListBlock}>
            <p className={styles.errorListHeading}>What went wrong:</p>
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
                Show all {errorList.length}
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
            This tracker is missing the Date or Reviews column. The fastest fix
            is a fresh tracker — we'll make it.
          </p>
          <button
            type="button"
            className={`${sharedStyles.btnPrimary} ${styles.inlineButton}`}
            onClick={startWizard}
          >
            Make a fresh tracker
          </button>
        </div>
      );
    }
    return (
      <p role="alert" className={sharedStyles.helpDanger}>
        Couldn't update Notion. {(exportMutation.error as Error).message}
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
        Create my review tracker
      </button>
      <hr className={sharedStyles.surfaceDivider} />
      <details>
        <summary className={styles.advancedSummary}>
          I already have one — pick from a list
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
          <p className={styles.trackerSummaryLabel}>Sending to</p>
          <p className={styles.trackerSummaryName}>
            {renderTrackerSummaryName()}
          </p>
        </div>
        <button
          type="button"
          className={styles.btnLink}
          onClick={() => setShowChange((current) => !current)}
        >
          {showChange ? 'Done' : 'Change'}
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
            Or make a fresh tracker
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
          <label htmlFor="ankify-date-range">Days back (optional)</label>
          <input
            id="ankify-date-range"
            type="number"
            min={1}
            value={dateRangeDays}
            onChange={(event) => setDateRangeDays(event.target.value)}
            placeholder="All time"
          />
        </div>
        <button
          type="submit"
          className={`${sharedStyles.btnPrimary} ${styles.inlineButton}`}
          disabled={exportMutation.isPending}
        >
          {exportMutation.isPending ? 'Updating…' : 'Update Notion'}
        </button>
      </form>

      <p className={styles.trustNote}>
        We only add new days. Existing rows are never overwritten.
      </p>

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
        <p className={styles.trackerStepLabel}>Step 2 of 2</p>
        <h4 className={styles.trackerStepTitle}>
          Create the tracker under "{pendingParent.title}"?
        </h4>
        <p className={styles.trackerStepHint}>
          We'll add a Notion database called "Anki review tracker" with three
          columns: Date, Reviews, Time spent (min). Each day's count becomes one
          row. Nothing else on your Notion page changes.
        </p>
        {createTracker.isError && (
          <p role="alert" className={sharedStyles.helpDanger}>
            Couldn't create the tracker.{' '}
            {(createTracker.error as Error).message}
          </p>
        )}
        <div className={styles.trackerStepActions}>
          <button
            type="button"
            className={`${sharedStyles.btnSecondary} ${styles.inlineButton}`}
            onClick={() => setWizard('pickParent')}
            disabled={createTracker.isPending}
          >
            Back
          </button>
          <button
            type="button"
            className={`${sharedStyles.btnPrimary} ${styles.inlineButton}`}
            onClick={() => createTracker.mutate(pendingParent.id)}
            disabled={createTracker.isPending}
          >
            {createTracker.isPending ? 'Creating…' : 'Create my tracker'}
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
