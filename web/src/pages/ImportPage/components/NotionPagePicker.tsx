import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { get2ankiApi } from '../../../lib/backend/get2ankiApi';
import NotionObject from '../../../lib/interfaces/NotionObject';
import styles from '../ImportPage.module.css';
import sharedStyles from '../../../styles/shared.module.css';

interface NotionPagePickerProps {
  selectedPageId: string | null;
  onPageSelected: (pageId: string, pageTitle: string) => void;
  disabled: boolean;
}

export default function NotionPagePicker({
  selectedPageId,
  onPageSelected,
  disabled,
}: Readonly<NotionPagePickerProps>) {
  const { t } = useTranslation('tools');
  const [query, setQuery] = useState('');
  const [pages, setPages] = useState<NotionObject[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = useCallback(async (searchQuery: string) => {
    setLoading(true);
    try {
      const results = await get2ankiApi().searchTopLevelPages(searchQuery);
      setPages(results);
      setSearched(true);
    } catch {
      setPages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    search('');
  }, [search]);

  const handleSearch = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      search(query);
    },
    [query, search]
  );

  return (
    <div className={styles.pagePicker}>
      <form onSubmit={handleSearch} className={styles.pagePickerSearch}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('import.searchPlaceholder')}
          disabled={disabled}
          className={styles.pagePickerInput}
        />
        <button
          type="submit"
          disabled={disabled || loading}
          className={sharedStyles.searchButton}
        >
          {t('import.searchButton')}
        </button>
      </form>
      <div className={styles.pagePickerList}>
        {loading && (
          <div className={sharedStyles.flexCenter}>
            <div className={sharedStyles.spinnerSmall} />
          </div>
        )}
        {!loading && searched && pages.length === 0 && (
          <p className={styles.pagePickerEmpty}>{t('import.noPagesFound')}</p>
        )}
        {!loading &&
          pages.map((page) => (
            <button
              key={page.id}
              type="button"
              className={`${styles.pagePickerRow} ${
                selectedPageId === page.id ? styles.pagePickerRowSelected : ''
              }`}
              onClick={() => onPageSelected(page.id, page.title)}
              disabled={disabled}
            >
              {page.icon ? (
                <span className={styles.pagePickerIcon}>{page.icon}</span>
              ) : null}
              <span className={styles.pagePickerTitle}>{page.title}</span>
            </button>
          ))}
      </div>
    </div>
  );
}
