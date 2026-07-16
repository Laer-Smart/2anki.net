import { useTranslation } from 'react-i18next';

import sharedStyles from '../../styles/shared.module.css';
import { Backend } from '../../lib/backend/Backend';
import WorkspaceBar from './components/WorkspaceBar';
import ReviewDataExport from './components/ReviewDataExport';

interface Props {
  readonly backend?: Backend;
}

export default function AnkifyHistoryPage({ backend }: Props) {
  const { t } = useTranslation('ankify');
  return (
    <main className={sharedStyles.page}>
      <WorkspaceBar backend={backend} showWorkspaceLink />
      <h1 className={sharedStyles.title}>{t('history.title')}</h1>
      <ReviewDataExport backend={backend} />
    </main>
  );
}
