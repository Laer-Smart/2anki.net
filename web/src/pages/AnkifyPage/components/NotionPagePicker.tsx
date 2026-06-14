import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import sharedStyles from '../../../styles/shared.module.css';
import styles from '../AnkifyPage.module.css';
import { Backend } from '../../../lib/backend/Backend';
import NotionObject from '../../../lib/interfaces/NotionObject';
import { BlockIcon } from '../../SearchPage/components/BlockIcon';

interface Props {
  readonly backend: Backend;
  readonly onSelect: (id: string, page?: NotionObject) => void;
  readonly busyId: string | null;
  readonly disabledIds?: ReadonlySet<string>;
  readonly selectLabel: string;
  readonly busyLabel: string;
  readonly subscribedLabel: string;
}

const DEBOUNCE_MS = 350;

export default function NotionPagePicker({
  backend,
  onSelect,
  busyId,
  disabledIds,
  selectLabel,
  busyLabel,
  subscribedLabel,
}: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NotionObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const timer = setTimeout(() => {
      backend
        .searchTopLevelPages(query)
        .then((data) => {
          if (cancelled) return;
          setResults(data);
          setLoading(false);
        })
        .catch((err: Error) => {
          if (cancelled) return;
          setError(err.message);
          setLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [backend, query]);

  return (
    <div className={styles.pickerWrapper}>
      <label htmlFor="ankify-page-picker">Search your Notion pages</label>
      <input
        id="ankify-page-picker"
        type="search"
        className={styles.pickerSearchInput}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      {loading && <p className={styles.pickerStatus}>Looking up your pages…</p>}
      {error != null && (
        <p className={sharedStyles.helpDanger}>
          Couldn't load your Notion pages. {error}
        </p>
      )}

      {(() => {
        const visible = results;

        if (!loading && error == null && visible.length === 0) {
          if (query.trim().length > 0) {
            return (
              <p className={styles.pickerStatus}>
                No pages match "{query}". Make sure the page is shared with
                2anki.
              </p>
            );
          }
          return (
            <p className={styles.pickerStatus}>
              No pages yet. Share one with 2anki from your{' '}
              <a href="/notion">Notion connections</a>.
            </p>
          );
        }

        if (visible.length === 0) return null;

        return (
          <ul className={styles.pickerList}>
            {visible.map((page) => {
              const isBusy = busyId === page.id;
              const alreadySubscribed = disabledIds?.has(page.id) ?? false;
              let buttonLabel = selectLabel;
              if (alreadySubscribed) {
                buttonLabel = subscribedLabel;
              } else if (isBusy) {
                buttonLabel = busyLabel;
              }
              return (
                <li key={page.id} className={styles.pickerItem}>
                  <div className={styles.pickerEntry}>
                    <BlockIcon icon={page.icon} />
                    <span className={styles.pickerTitle} title={page.title}>
                      {page.title}
                    </span>
                    <span className={styles.pickerType}>{page.object}</span>
                  </div>
                  {page.url && (
                    <a
                      href={page.url}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.pickerNotionLink}
                      aria-label={`Open ${page.title} in Notion (new tab)`}
                      title={`Open ${page.title} in Notion (new tab)`}
                    >
                      <img
                        src="/icons/Notion_app_logo.png"
                        alt=""
                        width="24"
                        height="24"
                      />
                    </a>
                  )}
                  <Link
                    to={`/rules/${page.id}`}
                    className={`${sharedStyles.btnSmall} ${styles.inlineButton}`}
                    aria-label={`Set rules for ${page.title} before making a deck`}
                    title="Set conversion rules before making a deck"
                  >
                    Set rules
                  </Link>
                  <button
                    type="button"
                    className={`${sharedStyles.btnSmall} ${styles.inlineButton}`}
                    onClick={() => onSelect(page.id, page)}
                    disabled={isBusy || alreadySubscribed}
                  >
                    {buttonLabel}
                  </button>
                </li>
              );
            })}
          </ul>
        );
      })()}
    </div>
  );
}
