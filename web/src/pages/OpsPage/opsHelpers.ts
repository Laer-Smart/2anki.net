import {
  OpsMetricsBucketPoint,
  OpsMetricsOutboundPoint,
  OpsMetricsWindow,
  StatusClass,
} from './opsTypes';

export const errorRatePercent = (errors: number, total: number): number => {
  if (total <= 0) return 0;
  return (errors / total) * 100;
};

export const errorRateColor = (percent: number): string => {
  if (percent < 1) return '#10b981';
  if (percent <= 5) return '#f59e0b';
  return '#dc2626';
};

export const formatPercent = (value: number): string => `${value.toFixed(1)}%`;

const ELLIPSIS = '…';

export const truncateRoute = (route: string, max = 32): string => {
  if (route.length <= max) return route;
  return `${route.slice(0, max - 1)}${ELLIPSIS}`;
};

const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const padTwo = (n: number): string => n.toString().padStart(2, '0');

export const formatBucketLabel = (
  isoBucket: string,
  window: OpsMetricsWindow
): string => {
  const date = new Date(isoBucket);
  if (Number.isNaN(date.getTime())) return isoBucket;
  if (window === '7d') {
    return `${MONTH_SHORT[date.getMonth()]} ${date.getDate()}`;
  }
  return `${padTwo(date.getHours())}:${padTwo(date.getMinutes())}`;
};

export const formatClock = (date: Date): string =>
  `${padTwo(date.getHours())}:${padTwo(date.getMinutes())}:${padTwo(date.getSeconds())}`;

export const formatLastSeen = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${date.getUTCDate()} ${MONTH_SHORT[date.getUTCMonth()]} ${date.getUTCFullYear()}, ${padTwo(date.getUTCHours())}:${padTwo(date.getUTCMinutes())} UTC`;
};

export const formatCount = (n: number): string => {
  if (n < 10_000) return String(n);
  return n.toLocaleString('en', { useGrouping: true }).replaceAll(',', ' ');
};

export const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(1)} GB`;
};

export const formatRatio = (ratio: number | null): string => {
  if (ratio == null) return '—';
  return `${(ratio * 100).toFixed(1)}%`;
};

export interface InboundBucketRow {
  bucket: string;
  '2xx': number;
  '3xx': number;
  '4xx': number;
  '5xx': number;
}

export const groupInboundByBucket = (
  points: OpsMetricsBucketPoint[]
): InboundBucketRow[] => {
  const byBucket = new Map<string, InboundBucketRow>();
  const order: string[] = [];
  for (const point of points) {
    let row = byBucket.get(point.bucket);
    if (row == null) {
      row = { bucket: point.bucket, '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 };
      byBucket.set(point.bucket, row);
      order.push(point.bucket);
    }
    row[point.status_class as StatusClass] += point.count;
  }
  return order.map((bucket) => byBucket.get(bucket) as InboundBucketRow);
};

export interface OutboundBucketRow {
  bucket: string;
  [service: string]: string | number;
}

export const groupOutboundByBucket = (
  points: OpsMetricsOutboundPoint[]
): OutboundBucketRow[] => {
  const byBucket = new Map<string, OutboundBucketRow>();
  const order: string[] = [];
  for (const point of points) {
    let row = byBucket.get(point.bucket);
    if (row == null) {
      row = { bucket: point.bucket };
      byBucket.set(point.bucket, row);
      order.push(point.bucket);
    }
    row[point.service] = point.count;
  }
  return order.map((bucket) => byBucket.get(bucket) as OutboundBucketRow);
};

export const collectOutboundServices = (
  points: OpsMetricsOutboundPoint[]
): string[] => {
  const seen = new Set<string>();
  const order: string[] = [];
  for (const point of points) {
    if (!seen.has(point.service)) {
      seen.add(point.service);
      order.push(point.service);
    }
  }
  return order;
};
