import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ErrorPresenter } from '../../components/errors/ErrorPresenter';
import { ErrorHandlerType } from '../../components/errors/helpers/getErrorMessage';
import { SkeletonList } from '../../components/Skeleton/Skeleton';
import { get2ankiApi } from '../../lib/backend/get2ankiApi';
import { useCardUsage } from '../../lib/hooks/useCardUsage';
import { useUserLocals } from '../../lib/hooks/useUserLocals';
import { isPayingUser } from '../../components/NavigationBar/helpers/getPlanLabel';
import styles from '../../styles/shared.module.css';
import ConnectNotion from './components/ConnectNotion';
import SearchContainer from './components/SearchContainer';
import useNotionData from './helpers/useNotionData';
import searchStyles from './SearchPage.module.css';

interface SearchPageProps {
  setError: ErrorHandlerType;
}

export function SearchPage({ setError }: Readonly<SearchPageProps>) {
  const notionData = useNotionData(get2ankiApi());
  const { data: userLocals } = useUserLocals();
  const isAuthenticated = userLocals?.user?.id != null;
  const cardUsage = useCardUsage(isAuthenticated);
  const overLimit =
    isAuthenticated &&
    !isPayingUser(userLocals?.locals) &&
    cardUsage != null &&
    !cardUsage.unlimited &&
    !cardUsage.loading &&
    cardUsage.cards_used >= cardUsage.cards_limit;
  const [dayPassPending, setDayPassPending] = useState(false);

  const handleDayPass = async () => {
    setDayPassPending(true);
    try {
      const result = await get2ankiApi().startPassCheckout(
        '24h',
        undefined,
        'notion-limit-wall'
      );
      if ('url' in result) {
        globalThis.location.href = result.url;
        return;
      }
    } finally {
      setDayPassPending(false);
    }
  };

  const headerTitle = notionData.connected ? 'Notion' : 'Get started';
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
  } else if (overLimit) {
    const used = cardUsage?.cards_used ?? 0;
    const limit = cardUsage?.cards_limit ?? 100;
    const now = new Date();
    const resetsOn = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      1
    ).toLocaleDateString(undefined, { day: 'numeric', month: 'long' });
    content = (
      <div className={searchStyles.limitLock}>
        <span className={searchStyles.limitLockIcon} aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            width="28"
            height="28"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </span>
        <p className={searchStyles.limitLockTitle}>
          You&apos;ve used all {limit} cards this month
        </p>
        <p className={searchStyles.limitLockBody}>
          {used} / {limit} cards · resets {resetsOn}, when your free cards come
          back
        </p>
        <div className={searchStyles.limitLockActions}>
          <button
            type="button"
            className={searchStyles.limitLockPrimary}
            onClick={handleDayPass}
            disabled={dayPassPending}
          >
            {dayPassPending ? 'Starting checkout' : 'Get Day Pass — $4'}
          </button>
          <Link
            to="/limit?ref=notion-limit-wall"
            className={searchStyles.limitLockSecondary}
          >
            See plans
          </Link>
        </div>
      </div>
    );
  } else if (notionData.connected) {
    content = (
      <SearchContainer
        backend={get2ankiApi()}
        setError={setError}
        workSpace={notionData.workSpace}
        isLoggedIn={notionData.connected}
      />
    );
  } else {
    content = (
      <ConnectNotion ready connectionLink={notionData.connectionLink} />
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
          <span className={searchStyles.workspaceName} data-hj-suppress>
            {notionData.workSpace}
          </span>
          <a
            href={notionData.connectionLink}
            className={searchStyles.workspaceSwitch}
          >
            Switch workspace
          </a>
        </div>
      )}
      {content}
    </div>
  );
}
