import { Dispatch, SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import Favorites from './Favorites';

import { ErrorHandlerType } from '../../../components/errors/helpers/getErrorMessage';
import NotionObject from '../../../lib/interfaces/NotionObject';
import { getVisibleText } from '../../../lib/text/getVisibleText';
import styles from '../../../styles/shared.module.css';

interface Props {
  favorites: NotionObject[];
  setError: ErrorHandlerType;
  setFavorites: Dispatch<SetStateAction<NotionObject[]>>;
}

export default function FavoritesPresenter({
  setError,
  setFavorites,
  favorites,
}: Readonly<Props>) {
  const { t } = useTranslation('previews');
  if (favorites.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>{getVisibleText('favorites.empty')}</p>
        <Link to="/shared-decks">{t('sharedLibrary.browseLibrary')}</Link>
      </div>
    );
  }
  return (
    <Favorites
      setError={setError}
      setFavorites={setFavorites}
      favorites={favorites}
    />
  );
}
