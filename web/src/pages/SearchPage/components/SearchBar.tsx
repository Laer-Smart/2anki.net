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
  return (
    <div>
      <label className={sharedStyles.srOnly} htmlFor="notion-search-input">
        Search Notion
      </label>
      <input
        id="notion-search-input"
        value={value}
        type="text"
        className={searchStyles.searchInput}
        placeholder="Search Notion"
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
