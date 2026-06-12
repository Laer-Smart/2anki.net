import { useMemo } from 'react';

import sharedStyles from '../../styles/shared.module.css';
import styles from './OpsPage.module.css';
import ChartPanel from './charts/ChartPanel';
import MetricCard from './MetricCard';
import { formatBytes, formatCount, formatRatio } from './opsHelpers';
import {
  useMindmapImageStats,
  useMindmapStorageMetrics,
} from './useMindmapOpsMetrics';
import { MindmapUserStorageEntry } from './mindmapOpsTypes';

const renderTopUsers = (rows: MindmapUserStorageEntry[]) => {
  if (rows.length === 0) {
    return <p className={styles.emptyHint}>No mindmap images stored yet.</p>;
  }
  return (
    <div className={styles.tableScroll}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>User</th>
            <th>Storage</th>
            <th>Objects</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.user_id}>
              <td className={styles.numericMuted}>{row.user_id}</td>
              <td className={styles.numeric}>{formatBytes(row.bytes)}</td>
              <td className={styles.numeric}>
                {formatCount(row.object_count)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default function MindmapsTab() {
  const imageStats = useMindmapImageStats();
  const storage = useMindmapStorageMetrics();

  const storageInitial = storage.isLoading && storage.data == null;
  const refreshing =
    (imageStats.isFetching && !imageStats.isLoading) ||
    (storage.isFetching && !storage.isLoading);

  const measured = useMemo(() => {
    const at = storage.data?.measured_at ?? imageStats.data?.as_of;
    if (at == null) return '—';
    return new Date(at).toLocaleTimeString();
  }, [storage.data?.measured_at, imageStats.data?.as_of]);

  const refetchAll = () => {
    imageStats.refetch();
    storage.refetch();
  };

  return (
    <>
      <div className={styles.tabHeader}>
        <div className={styles.controls}>
          <button
            type="button"
            className={`${sharedStyles.btnSmall} ${styles.refreshButton}`}
            onClick={refetchAll}
          >
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      <p className={styles.subtitle}>
        <span>Updated {measured}</span>
        <span className={styles.subtitleSeparator}>·</span>
        <span>image-paste adoption and S3 storage under mindmaps/</span>
      </p>

      {imageStats.error != null && (
        <div className={`${sharedStyles.alertDanger} ${styles.banner}`}>
          /api/ops/mindmap/image-stats failed: {imageStats.error.message}
        </div>
      )}
      {storage.error != null && (
        <div className={`${sharedStyles.alertDanger} ${styles.banner}`}>
          /api/ops/mindmap/storage failed: {storage.error.message}
        </div>
      )}

      <div className={styles.grid}>
        <MetricCard
          title="Maps with an image"
          value={formatRatio(imageStats.data?.ratio ?? null)}
          footnote={
            imageStats.data == null
              ? undefined
              : `${formatCount(imageStats.data.with_images)} of ${formatCount(imageStats.data.total)} maps`
          }
        />
        <MetricCard
          title="Image storage on S3"
          value={
            storage.data == null ? '—' : formatBytes(storage.data.total_bytes)
          }
          footnote={
            storage.data == null
              ? undefined
              : `${formatCount(storage.data.total_objects)} objects`
          }
        />

        <ChartPanel
          title="Top users by image storage"
          subtitle="Largest mindmap image footprints under the mindmaps/ prefix"
          isLoading={storageInitial}
          isEmpty={(storage.data?.top_users.length ?? 0) === 0}
          emptyText="No mindmap images stored yet."
          autoHeight
        >
          {storage.data != null && renderTopUsers(storage.data.top_users)}
        </ChartPanel>
      </div>
    </>
  );
}
