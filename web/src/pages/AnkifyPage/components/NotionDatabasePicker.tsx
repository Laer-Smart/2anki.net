import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation('ankify');
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
      <label htmlFor="ankify-notion-database">
        {t('databasePicker.label')}
      </label>
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
            ? t('databasePicker.loading')
            : t('databasePicker.pick')}
        </option>
        {databasesList.length > 0 && (
          <optgroup label={t('databasePicker.optgroup')}>
            {databasesList.map((db) => (
              <option key={db.id} value={db.id}>
                {db.title}
                {db.has_review_shape ? t('databasePicker.ready') : ''}
              </option>
            ))}
          </optgroup>
        )}
      </select>

      {selected != null && !selected.has_review_shape && (
        <div className={styles.shapeWarning} role="alert">
          <p className={styles.shapeWarningText}>
            {t('databasePicker.missingColumns')}
          </p>
          <button
            type="button"
            className={`${sharedStyles.btnPrimary} ${styles.inlineButton}`}
            onClick={onWantToCreate}
          >
            {t('databasePicker.makeFresh')}
          </button>
        </div>
      )}

      {databases.isError && (
        <p
          role="alert"
          className={sharedStyles.helpDanger}
          style={{ marginTop: '0.4rem' }}
        >
          {t('databasePicker.loadError', {
            error: (databases.error as Error).message,
          })}
        </p>
      )}

      {value.length > 0 && selected == null && databases.isFetched && (
        <p className={styles.muted} style={{ marginTop: '0.4rem' }}>
          {t('databasePicker.savedNotInList')}
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
          {t('databasePicker.advancedSummary')}
        </summary>
        <form onSubmit={handleAdvanced} className={styles.advancedBody}>
          <label htmlFor="ankify-database-advanced">
            {t('databasePicker.advancedLabel')}
          </label>
          <div className={styles.advancedRow}>
            <input
              id="ankify-database-advanced"
              type="text"
              value={advancedInput}
              onChange={(event) => setAdvancedInput(event.target.value)}
              placeholder={t('databasePicker.advancedPlaceholder')}
            />
            <button
              type="submit"
              className={`${sharedStyles.btnSecondary} ${styles.inlineButton}`}
              disabled={advancedInput.trim().length === 0}
            >
              {t('databasePicker.useDatabase')}
            </button>
          </div>
        </form>
      </details>
    </div>
  );
}
