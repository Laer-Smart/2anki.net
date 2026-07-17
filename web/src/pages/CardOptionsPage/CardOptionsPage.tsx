import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import { CardOptionsForm } from '../../components/CardOptionsForm/CardOptionsForm';
import { ErrorHandlerType } from '../../components/errors/helpers/getErrorMessage';
import { get2ankiApi } from '../../lib/backend/get2ankiApi';
import { useDialog } from '../../lib/hooks/useDialog';
import { useUserLocals } from '../../lib/hooks/useUserLocals';
import sharedStyles from '../../styles/shared.module.css';
import styles from './CardOptionsPage.module.css';

interface PerPageItem {
  pageId: string;
  title: string | null;
  updatedAt: string | null;
}

interface Props {
  setErrorMessage: ErrorHandlerType;
}

interface RelativeUnit {
  ms: number;
  unit: Intl.RelativeTimeFormatUnit;
}

const RELATIVE_UNITS: RelativeUnit[] = [
  { ms: 60_000, unit: 'minute' },
  { ms: 3_600_000, unit: 'hour' },
  { ms: 86_400_000, unit: 'day' },
  { ms: 2_592_000_000, unit: 'month' },
  { ms: 31_536_000_000, unit: 'year' },
];

function formatUpdatedAt(
  value: string | null,
  language: string,
  momentLabel: string
): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const diffMs = Date.now() - date.getTime();
  if (diffMs < RELATIVE_UNITS[0].ms) return momentLabel;
  let unit: RelativeUnit = RELATIVE_UNITS[0];
  for (const candidate of RELATIVE_UNITS) {
    if (diffMs >= candidate.ms) unit = candidate;
  }
  const count = Math.floor(diffMs / unit.ms);
  return new Intl.RelativeTimeFormat(language, { numeric: 'always' }).format(
    -count,
    unit.unit
  );
}

export default function CardOptionsPage({ setErrorMessage }: Readonly<Props>) {
  const { t, i18n } = useTranslation('accountx');
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { data: userLocals } = useUserLocals();
  const isLoggedIn = userLocals?.user?.id != null;
  const [perPageItems, setPerPageItems] = useState<PerPageItem[]>([]);
  const [pendingResetIds, setPendingResetIds] = useState<Set<string>>(
    new Set()
  );
  const [rowError, setRowError] = useState<string | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkSuccess, setBulkSuccess] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const bulkResetDialogRef = useDialog(confirmOpen, () =>
    setConfirmOpen(false)
  );
  const [bulkPending, setBulkPending] = useState(false);

  const pageId = params.get('pageId');
  const pageTitle = params.get('title');
  const returnToParam = params.get('returnTo');
  const returnTo = returnToParam ?? '/upload';
  const shouldReturnAfterSave = pageId != null || returnToParam != null;
  const cameFromNotion = returnToParam?.startsWith('/notion') === true;
  const showPagesSection = cameFromNotion || perPageItems.length > 0;

  const goBack = () => navigate(returnTo);

  const loadSettings = () => {
    get2ankiApi()
      .listSettings()
      .then((data) => setPerPageItems(data.items))
      .catch(() => setPerPageItems([]));
  };

  useEffect(() => {
    if (pageId != null) return;
    loadSettings();
  }, [pageId]);

  useEffect(() => {
    const hash = location.hash;
    if (!hash) return;
    const id = hash.slice(1);
    const tryScroll = () => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return true;
      }
      return false;
    };
    if (tryScroll()) return;
    const interval = setInterval(() => {
      if (tryScroll()) clearInterval(interval);
    }, 100);
    const timeout = setTimeout(() => clearInterval(interval), 3000);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [location.hash]);

  const handleRowReset = async (item: PerPageItem) => {
    setRowError(null);
    setPendingResetIds((prev) => new Set(prev).add(item.pageId));
    try {
      await Promise.all([
        get2ankiApi().deleteSettings(item.pageId),
        get2ankiApi().deleteRules(item.pageId),
      ]);
      setPerPageItems((prev) => prev.filter((p) => p.pageId !== item.pageId));
    } catch {
      setRowError(t('cardOptions.rowResetError'));
    } finally {
      setPendingResetIds((prev) => {
        const next = new Set(prev);
        next.delete(item.pageId);
        return next;
      });
    }
  };

  const handleBulkConfirm = async () => {
    setBulkError(null);
    setBulkPending(true);
    try {
      await get2ankiApi().deleteAllUserSettings();
      setBulkSuccess(true);
      setConfirmOpen(false);
      loadSettings();
    } catch {
      setBulkError(t('cardOptions.bulkResetError'));
      setConfirmOpen(false);
    } finally {
      setBulkPending(false);
    }
  };

  const anyRowPending = pendingResetIds.size > 0;
  const itemCount = perPageItems.length;

  return (
    <div className={styles.pageShell}>
      <div className={sharedStyles.page}>
        <header className={sharedStyles.pageHeader}>
          {pageId != null && (
            <button type="button" onClick={goBack} className={styles.backLink}>
              {t('cardOptions.back')}
            </button>
          )}
          <h1 className={sharedStyles.title}>{t('cardOptions.title')}</h1>
          {pageId == null && (
            <p className={sharedStyles.subtitle}>
              {t('cardOptions.subtitle')}
              {cameFromNotion && <> {t('cardOptions.subtitleNotion')}</>}{' '}
              <Link to="/documentation">{t('cardOptions.readDocs')}</Link>{' '}
              {t('cardOptions.readDocsSuffix')}
            </p>
          )}
          {pageId == null && !isLoggedIn && (
            <p className={sharedStyles.smallDescription}>
              {t('cardOptions.savedOnDevice')}{' '}
              <Link to="/login?redirect=/card-options">
                {t('cardOptions.signIn')}
              </Link>{' '}
              {t('cardOptions.keepAcrossDevices')}
            </p>
          )}
          {pageId != null && (
            <p className={sharedStyles.subtitle}>
              {t('cardOptions.perPageSubtitle', {
                title: pageTitle ?? t('cardOptions.thisPage'),
              })}
            </p>
          )}
        </header>

        {bulkSuccess && (
          <div
            className={sharedStyles.alertSuccess}
            role="status"
            aria-live="polite"
          >
            <p>{t('cardOptions.resetToastSuccess')}</p>
            <button
              type="button"
              className={sharedStyles.btnGhost}
              onClick={() => setBulkSuccess(false)}
            >
              {t('cardOptions.dismiss')}
            </button>
          </div>
        )}

        {bulkError && (
          <div className={sharedStyles.alertDanger} role="alert">
            {bulkError}
          </div>
        )}

        {pageId == null && showPagesSection && (
          <section className={`${styles.pagesSection} ${styles.pagesCard}`}>
            <h2 className={styles.pagesHeading}>
              {t('cardOptions.pagesWithCustom')}
              {perPageItems.length > 0 && (
                <span className={styles.sectionCount}>
                  {perPageItems.length}
                </span>
              )}
            </h2>

            {rowError && (
              <div className={sharedStyles.alertDanger} role="alert">
                {rowError}
              </div>
            )}

            {perPageItems.length === 0 ? (
              <p className={styles.emptyInCard}>
                {t('cardOptions.emptyPages')}
              </p>
            ) : (
              <>
                <ul className={styles.list}>
                  {perPageItems.map((item) => {
                    const displayTitle = item.title ?? null;
                    const baseHref = `/rules/${encodeURIComponent(item.pageId)}?returnTo=/card-options`;
                    const rulesHref = item.title
                      ? `${baseHref}&title=${encodeURIComponent(item.title)}`
                      : baseHref;
                    const isResetting = pendingResetIds.has(item.pageId);
                    return (
                      <li key={item.pageId}>
                        <div className={styles.entry}>
                          <Link
                            to={rulesHref}
                            className={styles.entryMeta}
                            aria-label={t('cardOptions.editSettingsFor', {
                              name: displayTitle ?? item.pageId,
                            })}
                          >
                            <div className={styles.entryText}>
                              <span className={styles.entryTitle}>
                                {displayTitle ?? t('cardOptions.untitledPage')}
                              </span>
                              {(() => {
                                const updatedLabel = formatUpdatedAt(
                                  item.updatedAt,
                                  i18n.language,
                                  t('cardOptions.moment')
                                );
                                return updatedLabel ? (
                                  <span className={styles.entryTimestamp}>
                                    {t('cardOptions.updated', {
                                      time: updatedLabel,
                                    })}
                                  </span>
                                ) : null;
                              })()}
                            </div>
                          </Link>
                          <div className={styles.entryActions}>
                            <button
                              type="button"
                              className={styles.resetButton}
                              onClick={() => handleRowReset(item)}
                              disabled={isResetting || bulkPending}
                              aria-label={t('cardOptions.resetNameToDefaults', {
                                name: displayTitle ?? item.pageId,
                              })}
                            >
                              {t('cardOptions.resetToDefaults')}
                            </button>
                            <a
                              href={`https://www.notion.so/${item.pageId.replaceAll('-', '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={styles.actionButton}
                              aria-label={t('cardOptions.openNameInNotion', {
                                name:
                                  displayTitle ?? t('cardOptions.pageFallback'),
                              })}
                              title={t('cardOptions.openInNotion')}
                            >
                              <img
                                src="/icons/Notion_app_logo.png"
                                alt=""
                                width={22}
                                height={22}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display =
                                    'none';
                                }}
                              />
                            </a>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                <div className={styles.sectionFooter}>
                  <button
                    type="button"
                    className={styles.bulkResetButton}
                    onClick={() => setConfirmOpen(true)}
                    disabled={anyRowPending || bulkPending}
                  >
                    {t('cardOptions.resetAllToDefaults')}
                  </button>
                </div>
              </>
            )}
          </section>
        )}

        {pageId == null && (
          <div className={styles.formHeader}>
            <hr className={styles.divider} />
            <h2 className={styles.formHeading}>
              {t('cardOptions.defaultOptions')}
            </h2>
            <p className={sharedStyles.smallDescription}>
              {cameFromNotion || perPageItems.length > 0
                ? t('cardOptions.defaultOptionsWithOverrides')
                : t('cardOptions.defaultOptionsUpload')}
            </p>
          </div>
        )}

        <CardOptionsForm
          pageId={pageId}
          pageTitle={pageTitle}
          isLoggedIn={isLoggedIn}
          onSaved={shouldReturnAfterSave ? goBack : undefined}
          onReset={shouldReturnAfterSave ? goBack : undefined}
          setError={setErrorMessage}
        />
      </div>

      <dialog
        ref={bulkResetDialogRef}
        className={sharedStyles.dialog}
        aria-labelledby="bulk-reset-dialog-title"
      >
        <div className={sharedStyles.modalCardNarrow}>
          <div className={sharedStyles.modalHeader}>
            <span
              id="bulk-reset-dialog-title"
              className={sharedStyles.modalHeaderTitle}
            >
              {t('cardOptions.resetAllTitle')}
            </span>
            <button
              type="button"
              className={sharedStyles.modalClose}
              onClick={() => setConfirmOpen(false)}
              aria-label={t('cardOptions.close')}
            >
              &times;
            </button>
          </div>
          <div className={sharedStyles.modalBody}>
            <p>{t('cardOptions.bulkBody', { count: itemCount })}</p>
          </div>
          <div className={sharedStyles.modalFooter}>
            <button
              type="button"
              className={sharedStyles.btnSecondary}
              onClick={() => setConfirmOpen(false)}
            >
              {t('cardOptions.cancel')}
            </button>
            <button
              type="button"
              className={sharedStyles.btnPrimary}
              onClick={handleBulkConfirm}
              disabled={bulkPending}
            >
              {t('cardOptions.resetPages', { count: itemCount })}
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
