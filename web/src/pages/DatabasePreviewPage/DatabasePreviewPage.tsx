import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';

import { EmptyState } from '../../components/EmptyState/EmptyState';
import { ErrorPresenter } from '../../components/errors/ErrorPresenter';
import { ErrorHandlerType } from '../../components/errors/helpers/getErrorMessage';
import ExternalLinkIcon from '../../components/icons/ExternalLinkIcon';
import { get2ankiApi } from '../../lib/backend/get2ankiApi';
import { DatabasePreviewResponse } from '../../lib/backend/Backend';
import { track } from '../../lib/analytics/track';
import sharedStyles from '../../styles/shared.module.css';
import styles from './DatabasePreviewPage.module.css';

const CELL_MAX = 40;

interface DatabasePreviewPageProps {
  setError: ErrorHandlerType;
}

function truncateCell(value: string): string {
  if (value.length <= CELL_MAX) return value;
  return `${value.slice(0, CELL_MAX)}…`;
}

function StatsLine({ data }: Readonly<{ data: DatabasePreviewResponse }>) {
  const { t } = useTranslation('previews');
  const rowsCopy = data.hasMore
    ? t('database.rowsMore', { value: data.rowCount })
    : t('database.rows', { count: data.rowCount });
  const columnsLabel = t('database.columns', { count: data.columns.length });
  const mapping = data.mapping;

  if (
    mapping.ambiguous ||
    mapping.frontField == null ||
    mapping.backField == null
  ) {
    return (
      <p className={styles.stats} aria-live="polite">
        <span>
          {rowsCopy} · {columnsLabel} ·{' '}
        </span>
        <span className={styles.statsWarning}>
          {t('database.columnMappingNeeded')}
        </span>
      </p>
    );
  }

  return (
    <p className={styles.stats} aria-live="polite">
      {rowsCopy} · {columnsLabel} ·{' '}
      {t('database.front', { field: mapping.frontField })} ·{' '}
      {t('database.back', { field: mapping.backField })}
    </p>
  );
}

function SampleFraming({ count }: Readonly<{ count: number }>) {
  const { t } = useTranslation('previews');
  return (
    <p className={styles.sampleFraming} aria-live="polite">
      {t('database.sampleFraming', { count })}
    </p>
  );
}

function PreviewTable({ data }: Readonly<{ data: DatabasePreviewResponse }>) {
  const { t } = useTranslation('previews');
  const { columns, samples, mapping } = data;
  return (
    <div className={styles.tableScroll}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((col) => {
              const isFront = col === mapping.frontField;
              const isBack = col === mapping.backField;
              let tooltip: string | undefined;
              if (isFront) tooltip = t('database.usedAsFront');
              else if (isBack) tooltip = t('database.usedAsBack');
              return (
                <th key={col} scope="col" title={tooltip}>
                  {(isFront || isBack) && (
                    <span aria-hidden="true" className={styles.mappedDot}>
                      ●
                    </span>
                  )}
                  {col}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody data-hj-suppress>
          {samples.map((sample) => (
            <tr key={sample.id}>
              {columns.map((col) => {
                const value = sample.values[col] ?? '';
                if (value === '') {
                  return (
                    <td
                      key={col}
                      className={styles.cellEmpty}
                      title={t('database.empty')}
                    >
                      —
                    </td>
                  );
                }
                return (
                  <td key={col} title={value}>
                    {truncateCell(value)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function DatabasePreviewPage({
  setError,
}: Readonly<DatabasePreviewPageProps>) {
  const { t } = useTranslation('previews');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [converting, setConverting] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['database-preview', id],
    queryFn: () => get2ankiApi().getDatabasePreview(id ?? ''),
    enabled: id != null && id.length > 0,
  });

  useEffect(() => {
    if (error) setError(error);
  }, [error, setError]);

  useEffect(() => {
    if (data) {
      track('database_preview_viewed', {
        databaseId: id,
        rowCount: data.rowCount,
        columnCount: data.columns.length,
        ambiguousMapping: data.mapping.ambiguous,
      });
    }
  }, [data, id]);

  if (!id) {
    return (
      <div className={sharedStyles.pageWide}>
        <p className={styles.empty}>{t('database.missingId')}</p>
      </div>
    );
  }

  if (error && !data) {
    const message = error instanceof Error ? error.message : '';
    const isNotFound = message.includes('404');
    if (isNotFound) {
      return (
        <div className={sharedStyles.pageWide}>
          <header className={sharedStyles.pageHeader}>
            <h1 className={sharedStyles.title}>{t('database.title')}</h1>
          </header>
          <EmptyState
            title={t('database.unavailableTitle')}
            description={t('database.unavailableDescription')}
          />
          <p>
            <Link to="/notion" className={sharedStyles.btnSecondary}>
              {t('database.backToNotionSearch')}
            </Link>
          </p>
        </div>
      );
    }
    return (
      <div className={sharedStyles.pageWide}>
        <header className={sharedStyles.pageHeader}>
          <h1 className={sharedStyles.title}>{t('database.title')}</h1>
        </header>
        <ErrorPresenter
          error={
            error instanceof Error ? new Error(t('database.readError')) : error
          }
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className={sharedStyles.pageWide}>
        <p className={styles.loading} aria-live="polite">
          {t('database.reading')}
        </p>
      </div>
    );
  }

  const handleConvert = () => {
    if (converting) return;
    setConverting(true);
    track('convert_clicked_from_preview', {
      databaseId: id,
      rowCount: data.rowCount,
      ambiguousMapping: data.mapping.ambiguous,
    });
    get2ankiApi()
      .convert(id, 'database', data.title)
      .then(async (response) => {
        if (response.status === 202) {
          navigate('/downloads');
        } else {
          const text = await response.text().catch(() => '');
          if (text) setError(new Error(text));
          setConverting(false);
        }
      })
      .catch((err: unknown) => {
        setError(err);
        setConverting(false);
      });
  };

  const showSampleFraming = data.rowCount > 0 && data.hasMore;

  return (
    <div className={sharedStyles.pageWide}>
      <div className={styles.backRow}>
        <Link to="/notion" className={styles.backLink}>
          {t('database.backToNotionSearch')}
        </Link>
      </div>

      <article className={sharedStyles.sectionCard}>
        <div className={styles.titleRow}>
          <h1 className={sharedStyles.title} data-hj-suppress>
            {data.title || t('database.untitledDatabase')}
          </h1>
          <span className={styles.headerLinks}>
            <button
              type="button"
              className={`${sharedStyles.btnPrimary} ${sharedStyles.btnInline}`}
              onClick={handleConvert}
              disabled={converting}
            >
              {converting
                ? t('database.converting')
                : t('database.convertToAnki')}
            </button>
            {data.url && (
              <a
                className={styles.pageLink}
                href={data.url}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLinkIcon width={16} height={16} />
                <span>{t('database.openInNotion')}</span>
              </a>
            )}
          </span>
        </div>

        <StatsLine data={data} />

        {data.rowCount === 0 ? (
          <p className={styles.empty}>{t('database.noRows')}</p>
        ) : (
          <>
            {showSampleFraming && <SampleFraming count={data.rowCount} />}
            <PreviewTable data={data} />
            {showSampleFraming && (
              <p className={styles.rowCapFooter}>
                {t('database.rowCapFooter', { count: data.rowCount })}
              </p>
            )}
          </>
        )}
      </article>
    </div>
  );
}
