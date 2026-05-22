import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MindmapLimitModal } from './MindmapLimitModal';
import { useMindmapList, useDeleteMindmap } from './useMindmap';
import styles from '../../styles/shared.module.css';

export function MindmapList() {
  const { data, isLoading } = useMindmapList();
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

  function handleNewMap() {
    if (atCap) {
      setShowLimitModal(true);
      return;
    }
    window.location.href = '/mindmaps/new';
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
        <div
          key={map.id}
          className={styles.card}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '0.75rem',
            padding: '1rem 1.5rem',
          }}
        >
          <Link
            to={`/mindmaps/${map.id}`}
            title={map.title}
            style={{
              fontWeight: 'var(--font-medium)',
              color: 'var(--color-text-primary)',
              textDecoration: 'none',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '60%',
            }}
          >
            {map.title.length === 0 ? 'Untitled' : map.title}
          </Link>
          <button
            type="button"
            onClick={() => deleteMindmap.mutate(map.id)}
            style={{
              padding: '0.375rem 0.75rem',
              background: 'transparent',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              color: 'var(--color-text-secondary)',
              fontSize: 'var(--text-sm)',
            }}
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}
