import { Dispatch, SetStateAction, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ErrorHandlerType } from '../../../components/errors/helpers/getErrorMessage';
import NotionObject from '../../../lib/interfaces/NotionObject';
import SearchObjectEntry from './SearchObjectEntry';
import styles from '../../../styles/shared.module.css';

interface ListSearchResultsProps {
  results: NotionObject[];
  setFavorites: Dispatch<SetStateAction<NotionObject[]>>;
  handleEmpty?: boolean;
  setError: ErrorHandlerType;
  searchQuery?: string;
  workSpace?: string | null;
}

function relevanceRank(title: string, query: string): number {
  const normalizedTitle = title.trim().toLowerCase();
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return 3;
  if (normalizedTitle === normalizedQuery) return 0;
  if (normalizedTitle.startsWith(normalizedQuery)) return 1;
  if (normalizedTitle.includes(normalizedQuery)) return 2;
  return 3;
}

export default function ListSearchResults(
  props: Readonly<ListSearchResultsProps>
): React.ReactNode {
  const { t } = useTranslation('search');
  const {
    results,
    handleEmpty = true,
    setFavorites,
    setError,
    searchQuery,
    workSpace,
  } = props;

  const orderedResults = useMemo(() => {
    if (!searchQuery?.trim()) return results;
    return results
      .map((item, index) => ({
        item,
        rank: relevanceRank(item.title, searchQuery),
        index,
      }))
      .sort((a, b) => a.rank - b.rank || a.index - b.index)
      .map((entry) => entry.item);
  }, [results, searchQuery]);

  const isEmpty = orderedResults.length < 1;

  if (isEmpty && handleEmpty) {
    const scope = workSpace
      ? t('results.scopeWorkspace', { workSpace })
      : t('results.scopeGeneric');
    const headline = searchQuery
      ? t('results.noMatch', { query: searchQuery, scope })
      : t('results.noneFound', { scope });
    return (
      <div className={styles.emptyState}>
        <p data-hj-suppress>{headline}</p>
        <p className={styles.secondaryText}>
          {t('results.emptyBodyPrefix')}
          <a
            target="_blank"
            rel="noreferrer"
            href="https://www.notion.so/help/guides/understanding-notions-sharing-settings"
          >
            {t('results.sharingLink')}
          </a>
          {t('results.emptyBodySuffix')}
        </p>
      </div>
    );
  }
  return (
    <>
      {orderedResults.map((p) => (
        <SearchObjectEntry
          setError={setError}
          setFavorites={setFavorites}
          isFavorite={p.isFavorite}
          type={p.object}
          key={p.url}
          title={p.title}
          icon={p.icon}
          url={p.url}
          id={p.id}
        />
      ))}
    </>
  );
}
