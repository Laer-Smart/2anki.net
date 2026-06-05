import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import sharedStyles from '../../../styles/shared.module.css';
import styles from '../AnkifyPage.module.css';
import { Backend } from '../../../lib/backend/Backend';

export interface NotionDatabaseOption {
  id: string;
  title: string;
  url: string | null;
  has_review_shape: boolean;
}

interface Props {
  readonly backend: Backend;
  readonly value: string;
  readonly onChange: (
    databaseId: string,
    picked?: NotionDatabaseOption
  ) => void;
  readonly onWantToCreate: () => void;
}

const DATABASES_KEY = ['ankify-notion-databases'];

const dedupeDatabases = (
  raw: ReadonlyArray<NotionDatabaseOption & { object?: string }>
): NotionDatabaseOption[] => {
  const byTitle = new Map<string, NotionDatabaseOption & { object?: string }>();
  for (const entry of raw) {
    const title = entry.title.trim();
    if (title.length === 0) continue;
    if (title.toLowerCase() === 'untitled database') continue;
    const key = title.toLowerCase();
    const existing = byTitle.get(key);
    if (existing == null) {
      byTitle.set(key, entry);
      continue;
    }
    const existingIsDataSource = existing.object === 'data_source';
    const incomingIsDataSource = entry.object === 'data_source';
    if (existingIsDataSource && !incomingIsDataSource) {
      byTitle.set(key, entry);
    }
  }
  return Array.from(byTitle.values()).map((entry) => ({
    id: entry.id,
    title: entry.title,
    url: entry.url,
    has_review_shape: entry.has_review_shape,
  }));
};

export default function NotionDatabasePicker({
  backend,
  value,
  onChange,
  onWantToCreate,
}: Props) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advancedInput, setAdvancedInput] = useState('');

  const databases = useQuery({
    queryKey: DATABASES_KEY,
    queryFn: async () => {
      const raw = await backend.listAnkifyNotionDatabases();
      return raw as Array<NotionDatabaseOption & { object?: string }>;
    },
  });

  const handleAdvanced = (event: React.FormEvent) => {
    event.preventDefault();
    const id = advancedInput.trim();
    if (id.length === 0) return;
    const picked = (databases.data ?? []).find((d) => d.id === id);
    onChange(id, picked);
    setShowAdvanced(false);
    setAdvancedInput('');
  };

  const databasesList = dedupeDatabases(databases.data ?? []);
  const selected = databasesList.find((d) => d.id === value);

  return (
    <div>
      <label htmlFor="ankify-notion-database">Pick a different tracker</label>
      <select
        id="ankify-notion-database"
        value={value}
        onChange={(event) => {
          const next = event.target.value;
          const picked = databasesList.find((d) => d.id === next);
          onChange(next, picked);
        }}
        disabled={databases.isLoading}
      >
        <option value="">
          {databases.isLoading
            ? 'Loading your Notion databases…'
            : 'Pick a database…'}
        </option>
        {databasesList.length > 0 && (
          <optgroup label="Your Notion databases">
            {databasesList.map((db) => (
              <option key={db.id} value={db.id}>
                {db.title}
                {db.has_review_shape ? ' · ready' : ''}
              </option>
            ))}
          </optgroup>
        )}
      </select>

      {selected != null && !selected.has_review_shape && (
        <div className={styles.shapeWarning} role="alert">
          <p className={styles.shapeWarningText}>
            This database is missing the Date or Reviews column 2anki needs.
            Sending will fail until those columns exist.
          </p>
          <button
            type="button"
            className={`${sharedStyles.btnPrimary} ${styles.inlineButton}`}
            onClick={onWantToCreate}
          >
            Make a fresh tracker for me
          </button>
        </div>
      )}

      {databases.isError && (
        <p
          role="alert"
          className={sharedStyles.helpDanger}
          style={{ marginTop: '0.4rem' }}
        >
          Couldn't load your Notion databases:{' '}
          {(databases.error as Error).message}
        </p>
      )}

      {value.length > 0 && selected == null && databases.isFetched && (
        <p className={styles.muted} style={{ marginTop: '0.4rem' }}>
          Saved tracker isn't in your current Notion list. It still works — if
          it doesn't, re-share the database with 2anki in Notion.
        </p>
      )}

      <details
        className={styles.advancedDetails}
        open={showAdvanced}
        onToggle={(event) =>
          setShowAdvanced((event.target as HTMLDetailsElement).open)
        }
        style={{ marginTop: '0.6rem' }}
      >
        <summary className={styles.advancedSummary}>
          Don't see your database? Paste an ID instead.
        </summary>
        <form onSubmit={handleAdvanced} className={styles.advancedBody}>
          <label htmlFor="ankify-database-advanced">Notion database ID</label>
          <div className={styles.advancedRow}>
            <input
              id="ankify-database-advanced"
              type="text"
              value={advancedInput}
              onChange={(event) => setAdvancedInput(event.target.value)}
              placeholder="Paste from your Notion database URL"
            />
            <button
              type="submit"
              className={`${sharedStyles.btnSecondary} ${styles.inlineButton}`}
              disabled={advancedInput.trim().length === 0}
            >
              Use this database
            </button>
          </div>
        </form>
      </details>
    </div>
  );
}
