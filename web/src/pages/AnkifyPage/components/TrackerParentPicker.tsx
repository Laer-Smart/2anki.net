import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import sharedStyles from '../../../styles/shared.module.css';
import styles from '../AnkifyPage.module.css';
import { Backend } from '../../../lib/backend/Backend';
import NotionObject from '../../../lib/interfaces/NotionObject';
import { BlockIcon } from '../../SearchPage/components/BlockIcon';

interface Props {
  readonly backend: Backend;
  readonly suggestedPageId?: string | null;
  readonly busy: boolean;
  readonly onConfirm: (page: NotionObject) => void;
  readonly onCancel: () => void;
}

const DEBOUNCE_MS = 300;

export default function TrackerParentPicker({
  backend,
  suggestedPageId,
  busy,
  onConfirm,
  onCancel,
}: Props) {
  const { t } = useTranslation('ankify');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NotionObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(
    suggestedPageId ?? null
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const pickNextSelectedId = (
      current: string | null,
      pages: NotionObject[]
    ): string | null => {
      if (current != null && pages.some((p) => p.id === current)) {
        return current;
      }
      if (
        suggestedPageId != null &&
        pages.some((p) => p.id === suggestedPageId)
      ) {
        return suggestedPageId;
      }
      return pages[0]?.id ?? null;
    };

    const handleSearchResults = (data: NotionObject[]) => {
      if (cancelled) return;
      setResults(data);
      setLoading(false);
      setSelectedId((current) => pickNextSelectedId(current, data));
    };

    const handleSearchError = (err: Error) => {
      if (cancelled) return;
      setError(err.message);
      setLoading(false);
    };

    const timer = setTimeout(() => {
      backend
        .searchTopLevelPages(query)
        .then(handleSearchResults)
        .catch(handleSearchError);
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [backend, query, suggestedPageId]);

  const selected = results.find((r) => r.id === selectedId) ?? null;

  return (
    <div className={styles.trackerStep}>
      <p className={styles.trackerStepLabel}>{t('trackerPicker.step')}</p>
      <h4 className={styles.trackerStepTitle}>{t('trackerPicker.title')}</h4>
      <p className={styles.trackerStepHint}>{t('trackerPicker.hint')}</p>

      <input
        type="search"
        className={styles.pickerSearchInput}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t('trackerPicker.searchPlaceholder')}
        aria-label={t('trackerPicker.searchLabel')}
      />

      {loading && (
        <p className={styles.pickerStatus}>{t('trackerPicker.looking')}</p>
      )}

      {error != null && (
        <p role="alert" className={sharedStyles.helpDanger}>
          {t('trackerPicker.loadError', { error })}
        </p>
      )}

      {!loading && error == null && results.length === 0 && (
        <p className={styles.pickerStatus}>
          {query.trim().length > 0
            ? t('trackerPicker.noMatch', { query })
            : t('trackerPicker.emptyList')}
        </p>
      )}

      {results.length > 0 && (
        <ul
          className={styles.selectableList}
          aria-label={t('trackerPicker.pagesLabel')}
        >
          {results.map((page) => {
            const isSelected = page.id === selectedId;
            return (
              <li key={page.id}>
                <button
                  type="button"
                  aria-pressed={isSelected}
                  className={
                    isSelected
                      ? styles.selectableRowSelected
                      : styles.selectableRow
                  }
                  onClick={() => setSelectedId(page.id)}
                >
                  <span className={styles.selectableIcon}>
                    <BlockIcon icon={page.icon} />
                  </span>
                  <span className={styles.selectableTitle} title={page.title}>
                    {page.title}
                  </span>
                  {isSelected && (
                    <span className={styles.selectableCheck} aria-hidden="true">
                      ✓
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className={styles.trackerStepActions}>
        <button
          type="button"
          className={`${sharedStyles.btnSecondary} ${styles.inlineButton}`}
          onClick={onCancel}
          disabled={busy}
        >
          {t('trackerPicker.cancel')}
        </button>
        <button
          type="button"
          className={`${sharedStyles.btnPrimary} ${styles.inlineButton}`}
          onClick={() => {
            if (selected != null) {
              onConfirm(selected);
            }
          }}
          disabled={selected == null || busy}
        >
          {busy ? t('trackerPicker.creating') : t('trackerPicker.usePage')}
        </button>
      </div>
    </div>
  );
}
