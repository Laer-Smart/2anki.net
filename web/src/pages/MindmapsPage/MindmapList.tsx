import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MindmapLimitModal } from './MindmapLimitModal';
import { useMindmapList, useCreateMindmap, useDeleteMindmap } from './useMindmap';
import shared from '../../styles/shared.module.css';
import styles from './MindmapList.module.css';
import TrashIcon from '../../components/icons/TrashIcon';

export function MindmapList() {
  const navigate = useNavigate();
  const { data, isLoading } = useMindmapList();
  const createMindmap = useCreateMindmap();
  const deleteMindmap = useDeleteMindmap();
  const [showLimitModal, setShowLimitModal] = useState(false);

  const atCap =
    data?.access != null &&
    !data.access.hasUnlimited &&
    data.access.currentCount >= data.access.freeMapLimit;

  const nearCap =
    data?.access != null &&
    !data.access.hasUnlimited &&
    data.access.currentCount >= data.access.freeMapLimit - 1;

  async function handleNewMap() {
    if (atCap) {
      setShowLimitModal(true);
      return;
    }
    const created = await createMindmap.mutateAsync('Untitled');
    if (created?.id != null) {
      navigate(`/mindmaps/${created.id}`);
    }
  }

  if (showLimitModal) {
    return <MindmapLimitModal onClose={() => setShowLimitModal(false)} />;
  }

  if (isLoading) {
    return (
      <div className={shared.page}>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
          Reading your mind maps
        </p>
      </div>
    );
  }

  return (
    <div className={shared.page}>
      <div className={shared.pageHeader} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 className={shared.title}>Mind maps</h1>
          <p className={shared.subtitle}>Build a map, then download it as an Anki deck.</p>
        </div>
        <button
          type="button"
          onClick={handleNewMap}
          className={`${shared.btnPrimary} ${shared.btnInline}`}
        >
          New map
        </button>
      </div>

      {nearCap && !atCap && (
        <div className={shared.notificationInfo} style={{ marginBottom: '1rem' }}>
          Your monthly limit: 3 mind maps. Upgrade for unlimited.
        </div>
      )}

      {data?.maps.length === 0 && (
        <div className={shared.emptyState}>
          <p style={{ marginBottom: '1rem', color: 'var(--color-text-primary)', fontSize: 'var(--text-sm)' }}>
            No mind maps yet.
          </p>
          <button
            type="button"
            onClick={handleNewMap}
            className={`${shared.btnOutline} ${shared.btnInline}`}
          >
            New map
          </button>
        </div>
      )}

      {(data?.maps ?? []).map((map) => (
        <button
          key={map.id}
          type="button"
          onClick={() => navigate(`/mindmaps/${map.id}`)}
          className={styles.mapRow}
        >
          <span
            className={styles.mapTitle}
            title={map.title}
          >
            {map.title.length === 0 ? 'Untitled' : map.title}
          </span>
          <span className={styles.mapActions}>
            <span
              role="button"
              tabIndex={0}
              aria-label={`Delete ${map.title.length === 0 ? 'Untitled' : map.title}`}
              onClick={(e) => {
                e.stopPropagation();
                deleteMindmap.mutate(map.id);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  deleteMindmap.mutate(map.id);
                }
              }}
              className={styles.deleteBtn}
            >
              <TrashIcon width={16} height={16} />
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}
