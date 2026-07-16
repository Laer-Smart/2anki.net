import { useTranslation } from 'react-i18next';
import sharedStyles from '../../../styles/shared.module.css';
import searchStyles from '../SearchPage.module.css';

interface SearchBarProps {
  value: string;
  onSearchQueryChanged: (query: string) => void;
  onSearchClicked: () => void;
  inProgress: boolean;
}

function SearchBar({
  value,
  onSearchQueryChanged,
  onSearchClicked,
  inProgress,
}: Readonly<SearchBarProps>) {
  const { t } = useTranslation('search');
  return (
    <div>
      <label className={sharedStyles.srOnly} htmlFor="notion-search-input">
        {t('searchBar.label')}
      </label>
      <input
        id="notion-search-input"
        value={value}
        type="text"
        className={searchStyles.searchInput}
        placeholder={t('searchBar.placeholder')}
        aria-busy={inProgress}
        data-searching={inProgress ? 'true' : 'false'}
        onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
          if (e.key === 'Enter') {
            onSearchClicked();
          }
        }}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
          onSearchQueryChanged(event.target.value);
        }}
      />
    </div>
  );
}

export default SearchBar;
