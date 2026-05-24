import React from 'react';
import SearchContainer from './components/SearchContainer';
import useNotionData from './helpers/useNotionData';
import ConnectNotion from './components/ConnectNotion';
import { SkeletonList } from '../../components/Skeleton/Skeleton';
import { ErrorHandlerType } from '../../components/errors/helpers/getErrorMessage';
import { get2ankiApi } from '../../lib/backend/get2ankiApi';
import { ErrorPresenter } from '../../components/errors/ErrorPresenter';
import styles from '../../styles/shared.module.css';
import searchStyles from './SearchPage.module.css';

interface SearchPageProps {
  setError: ErrorHandlerType;
}

export function SearchPage({ setError }: Readonly<SearchPageProps>) {
  const notionData = useNotionData(get2ankiApi());

  const headerTitle = notionData.connected
    ? 'Notion'
    : 'Get started';
  const headerSubtitle = notionData.connected
    ? 'Find a page and convert it into an Anki deck.'
    : 'Connect your Notion workspace or upload files to create Anki decks.';

  let content;
  if (notionData.loading) {
    content = <SkeletonList count={6} />;
  } else if (notionData.error) {
    content = (
      <ErrorPresenter error={notionData.error} onRetry={notionData.refetch} />
    );
  } else if (notionData.connected) {
    content = (
      <SearchContainer
        backend={get2ankiApi()}
        setError={setError}
        workSpace={notionData.workSpace}
      />
    );
  } else {
    content = (
      <ConnectNotion
        ready
        connectionLink={notionData.connectionLink}
      />
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <h1 className={styles.title}>{headerTitle}</h1>
        <p className={styles.subtitle}>{headerSubtitle}</p>
      </header>
      {notionData.connected && notionData.workSpace && (
        <div className={searchStyles.workspaceLine}>
          <span className={searchStyles.workspaceDot} />
          <span className={searchStyles.workspaceName}>
            {notionData.workSpace}
          </span>
          <a
            href={notionData.connectionLink}
            className={searchStyles.workspaceSwitch}
          >
            Switch
          </a>
        </div>
      )}
      {content}
    </div>
  );
}
