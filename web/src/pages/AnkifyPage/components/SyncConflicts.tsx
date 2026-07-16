import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import sharedStyles from '../../../styles/shared.module.css';
import styles from '../AnkifyPage.module.css';
import { get2ankiApi } from '../../../lib/backend/get2ankiApi';
import { Backend } from '../../../lib/backend/Backend';

interface Props {
  readonly backend?: Backend;
  readonly embedded?: boolean;
}

const CONFLICTS_KEY = ['ankify-conflicts'];
const SUBSCRIPTIONS_KEY = ['ankify-subscriptions'];

export default function SyncConflicts({ backend, embedded = false }: Props) {
  const { t } = useTranslation('ankify');
  const api = backend ?? get2ankiApi();
  const queryClient = useQueryClient();
  const [offlineConflictId, setOfflineConflictId] = useState<number | null>(
    null
  );

  const conflicts = useQuery({
    queryKey: CONFLICTS_KEY,
    queryFn: () => api.listAnkifyConflicts(),
    refetchInterval: 30_000,
  });

  const subscriptions = useQuery({
    queryKey: SUBSCRIPTIONS_KEY,
    queryFn: () => api.listAnkifySubscriptions(),
  });

  const resolve = useMutation({
    mutationFn: ({
      id,
      resolution,
    }: {
      id: number;
      resolution: 'keep_notion' | 'keep_anki' | 'dismissed';
    }) => api.resolveAnkifyConflict(id, resolution),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CONFLICTS_KEY }),
  });

  const openInAnki = useMutation({
    mutationFn: (id: number) => api.openAnkifyConflictInAnki(id),
    onSuccess: (result, id) => {
      setOfflineConflictId(result.opened ? null : id);
    },
    onError: (_error, id) => setOfflineConflictId(id),
  });

  const items = conflicts.data ?? [];

  if (items.length === 0) {
    return null;
  }

  const subscriptionTitleByPageId = new Map<string, string>();
  for (const sub of subscriptions.data ?? []) {
    if (sub.notion_page_title != null && sub.notion_page_title.length > 0) {
      subscriptionTitleByPageId.set(sub.notion_page_id, sub.notion_page_title);
    }
  }

  const list = (
    <div className={styles.conflictList}>
      {items.map((conflict) => {
        const matchingTitle = subscriptionTitleByPageId.get(conflict.source_id);
        return (
          <article key={conflict.id} className={styles.conflictCard}>
            {matchingTitle != null && (
              <p className={styles.trackerSummaryName}>{matchingTitle}</p>
            )}
            <div className={styles.conflictGrid}>
              <div className={styles.conflictPanel}>
                <p className={styles.conflictSide}>
                  {t('conflicts.notionVersion')}
                </p>
                <p className={styles.conflictFront}>
                  {conflict.notion_snapshot?.front ?? ''}
                </p>
                <p className={styles.conflictBack}>
                  {conflict.notion_snapshot?.back ?? ''}
                </p>
              </div>
              <div className={styles.conflictPanel}>
                <p className={styles.conflictSide}>
                  {t('conflicts.ankiVersion')}
                </p>
                <p className={styles.conflictFront}>
                  {conflict.anki_snapshot?.front ?? ''}
                </p>
                <p className={styles.conflictBack}>
                  {conflict.anki_snapshot?.back ?? ''}
                </p>
              </div>
            </div>
            <div className={styles.conflictActions}>
              <button
                type="button"
                className={`${sharedStyles.btnPrimary} ${styles.inlineButton}`}
                onClick={() =>
                  resolve.mutate({
                    id: conflict.id,
                    resolution: 'keep_notion',
                  })
                }
                disabled={resolve.isPending}
              >
                {t('conflicts.keepNotion')}
              </button>
              <button
                type="button"
                className={`${sharedStyles.btnSecondary} ${styles.inlineButton}`}
                onClick={() =>
                  resolve.mutate({
                    id: conflict.id,
                    resolution: 'keep_anki',
                  })
                }
                disabled={resolve.isPending}
              >
                {t('conflicts.keepAnki')}
              </button>
              <button
                type="button"
                className={`${sharedStyles.btnSmall} ${styles.inlineButton}`}
                onClick={() =>
                  resolve.mutate({
                    id: conflict.id,
                    resolution: 'dismissed',
                  })
                }
                disabled={resolve.isPending}
              >
                {t('conflicts.decideLater')}
              </button>
              <button
                type="button"
                className={`${sharedStyles.btnSmall} ${styles.inlineButton}`}
                onClick={() => openInAnki.mutate(conflict.id)}
                disabled={
                  openInAnki.isPending && openInAnki.variables === conflict.id
                }
              >
                {t('conflicts.openInAnki')}
              </button>
            </div>
            {offlineConflictId === conflict.id && (
              <p className={styles.emptyLine} role="status">
                {t('conflicts.offlineMessage')}
              </p>
            )}
          </article>
        );
      })}
    </div>
  );

  if (embedded) {
    return list;
  }

  return (
    <section className={styles.sectionFlow}>
      <div className={sharedStyles.surfaceWarning}>
        <header className={sharedStyles.surfaceHeader}>
          <div className={sharedStyles.surfaceHeaderText}>
            <h2 className={sharedStyles.surfaceTitle}>
              {t('conflicts.heading')}
            </h2>
            <p className={sharedStyles.surfaceLead}>{t('conflicts.lead')}</p>
          </div>
          <div className={sharedStyles.surfaceActions}>
            <span className={sharedStyles.badgeWarning}>
              {t('conflicts.toResolve', { count: items.length })}
            </span>
          </div>
        </header>
        {list}
      </div>
    </section>
  );
}
