import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MindmapLimitModal } from './MindmapLimitModal';
import { useMindmapList, useCreateMindmap, useDeleteMindmap } from './useMindmap';
import styles from '../../styles/shared.module.css';

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
    return <p>Reading your mind maps</p>;
  }

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
        }}
      >
        <h1
          style={{
            fontSize: 'var(--text-2xl)',
            fontWeight: 'var(--font-semibold)',
            margin: 0,
          }}
        >
          Mind maps
        </h1>
        <button
          type="button"
          onClick={handleNewMap}
          style={{
            padding: '0.5rem 1rem',
            background: 'var(--color-primary)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            fontWeight: 'var(--font-medium)',
          }}
        >
          New map
        </button>
      </div>

      {nearCap && !atCap && (
        <div className={styles.notificationInfo} style={{ marginBottom: '1rem' }}>
          Your monthly limit: 3 mind maps. Upgrade for unlimited.
        </div>
      )}

      {data?.maps.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '4rem 1rem',
            color: 'var(--color-text-secondary)',
          }}
        >
          <p
            style={{
              fontSize: 'var(--text-lg)',
              marginBottom: '1rem',
              color: 'var(--color-text-primary)',
            }}
          >
            Build a map, then download it as an Anki deck.
          </p>
          <button
            type="button"
            onClick={handleNewMap}
            style={{
              padding: '0.5rem 1.25rem',
              background: 'var(--color-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              fontWeight: 'var(--font-medium)',
            }}
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
          className={styles.card}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '0.75rem',
            padding: '1rem 1.5rem',
            width: '100%',
            border: '1px solid var(--color-border)',
            background: 'var(--color-bg-primary)',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <span
            title={map.title}
            style={{
              fontWeight: 'var(--font-medium)',
              color: 'var(--color-text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '60%',
            }}
          >
            {map.title.length === 0 ? 'Untitled' : map.title}
          </span>
          <span
            role="button"
            tabIndex={0}
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
            className={styles.btnSecondary}
            style={{ minHeight: 'auto', padding: '0.375rem 0.75rem', fontSize: 'var(--text-sm)', cursor: 'pointer' }}
          >
            Delete
          </span>
        </button>
      ))}
    </div>
  );
}
