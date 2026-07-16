import { useTranslation } from 'react-i18next';
import styles from './Skeleton.module.css';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  radius?: string;
}

export function Skeleton({
  width,
  height = '1rem',
  radius,
}: Readonly<SkeletonProps>) {
  return (
    <span
      className={styles.skeleton}
      aria-hidden="true"
      style={{
        width: typeof width === 'number' ? `${width}px` : (width ?? '100%'),
        height: typeof height === 'number' ? `${height}px` : height,
        borderRadius: radius,
      }}
    />
  );
}

interface SkeletonRowProps {
  iconSize?: number;
  titleWidth?: string;
  actionCount?: number;
}

export function SkeletonRow({
  iconSize = 28,
  titleWidth = '40%',
  actionCount = 2,
}: Readonly<SkeletonRowProps>) {
  return (
    <div className={styles.row}>
      <div className={styles.rowMeta}>
        <Skeleton
          width={iconSize}
          height={iconSize}
          radius="var(--radius-sm)"
        />
        <Skeleton width={titleWidth} height="1rem" />
      </div>
      <div className={styles.rowActions}>
        {Array.from({ length: actionCount }, (_, idx) => (
          <Skeleton key={idx} width={72} height="1.25rem" />
        ))}
      </div>
    </div>
  );
}

interface SkeletonListProps {
  count?: number;
  rowProps?: SkeletonRowProps;
}

export function SkeletonList({
  count = 5,
  rowProps,
}: Readonly<SkeletonListProps>) {
  const { t } = useTranslation('errors');
  return (
    <output aria-label={t('skeleton.loading')}>
      {Array.from({ length: count }, (_, idx) => (
        <SkeletonRow key={idx} {...rowProps} />
      ))}
    </output>
  );
}

interface SkeletonPageProps {
  rows?: number;
}

export function SkeletonPage({ rows = 5 }: Readonly<SkeletonPageProps>) {
  return (
    <div className={styles.pageShell}>
      <div className={styles.pageHeader} aria-hidden="true">
        <Skeleton width="40%" height="2rem" />
        <Skeleton width="60%" height="1rem" />
      </div>
      <SkeletonList count={rows} />
    </div>
  );
}
