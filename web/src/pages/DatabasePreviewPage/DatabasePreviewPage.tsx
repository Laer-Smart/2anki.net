import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
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
  const rowsCopy = data.hasMore
    ? `${data.rowCount}+ rows`
    : `${data.rowCount} ${data.rowCount === 1 ? 'row' : 'rows'}`;
  const columnsLabel = `${data.columns.length} ${data.columns.length === 1 ? 'column' : 'columns'}`;
  const mapping = data.mapping;

  if (mapping.ambiguous || mapping.frontField == null || mapping.backField == null) {
    return (
      <p className={styles.stats} aria-live="polite">
        <span>{rowsCopy} · {columnsLabel} · </span>
        <span className={styles.statsWarning}>Column mapping needed</span>
      </p>
    );
  }

  return (
    <p className={styles.stats} aria-live="polite">
      {rowsCopy} · {columnsLabel} · Front: {mapping.frontField} · Back: {mapping.backField}
    </p>
  );
}

function PreviewTable({ data }: Readonly<{ data: DatabasePreviewResponse }>) {
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
              if (isFront) tooltip = 'Used as card front';
              else if (isBack) tooltip = 'Used as card back';
              return (
                <th key={col} scope="col" title={tooltip}>
                  {(isFront || isBack) && (
                    <span aria-hidden="true" className={styles.mappedDot}>●</span>
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
                    <td key={col} className={styles.cellEmpty} title="(empty)">
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

export default function DatabasePreviewPage({ setError }: Readonly<DatabasePreviewPageProps>) {
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
        <p className={styles.empty}>Missing database id.</p>
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
            <h1 className={sharedStyles.title}>Database preview</h1>
          </header>
          <EmptyState
            title="This database is no longer available"
            description="It may have been deleted or moved in Notion."
          />
          <p>
            <Link to="/notion" className={sharedStyles.btnSecondary}>
              Back to Notion search
            </Link>
          </p>
        </div>
      );
    }
    return (
      <div className={sharedStyles.pageWide}>
        <header className={sharedStyles.pageHeader}>
          <h1 className={sharedStyles.title}>Database preview</h1>
        </header>
        <ErrorPresenter
          error={
            error instanceof Error
              ? new Error(
                  "We couldn't read this database. Check that 2anki still has access in Notion, then try again."
                )
              : error
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
          Reading your database
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

  const showRowCapFooter = data.rowCount > 0 && data.hasMore;

  return (
    <div className={sharedStyles.pageWide}>
      <div className={styles.backRow}>
        <Link to="/notion" className={styles.backLink}>
          ← Back to Notion search
        </Link>
      </div>

      <article className={sharedStyles.sectionCard}>
        <div className={styles.titleRow}>
          <h1 className={sharedStyles.title} data-hj-suppress>
            {data.title || 'Untitled database'}
          </h1>
          <span className={styles.headerLinks}>
            <button
              type="button"
              className={`${sharedStyles.btnPrimary} ${sharedStyles.btnInline}`}
              onClick={handleConvert}
              disabled={converting}
            >
              {converting ? 'Converting…' : 'Convert to Anki'}
            </button>
            {data.url && (
              <a
                className={styles.pageLink}
                href={data.url}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLinkIcon width={16} height={16} />
                <span>Open in Notion</span>
              </a>
            )}
          </span>
        </div>

        <StatsLine data={data} />

        {data.rowCount === 0 ? (
          <p className={styles.empty}>This database has no rows yet.</p>
        ) : (
          <>
            <PreviewTable data={data} />
            {showRowCapFooter && (
              <p className={styles.rowCapFooter}>
                Showing the first {data.rowCount} rows. Convert to see all of them.
              </p>
            )}
          </>
        )}
      </article>
    </div>
  );
}
