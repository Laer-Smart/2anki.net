import { describe, expect, it } from 'vitest';

import {
  errorRateColor,
  errorRatePercent,
  formatBucketLabel,
  formatBytes,
  formatPercent,
  formatRatio,
  groupInboundByBucket,
  groupOutboundByBucket,
  truncateRoute,
} from './opsHelpers';
import { OpsMetricsResponse } from './opsTypes';

describe('errorRatePercent', () => {
  it('returns 0 when there are no requests', () => {
    expect(errorRatePercent(0, 0)).toBe(0);
  });

  it('returns the share of errors as a percentage in 0-100', () => {
    expect(errorRatePercent(31, 500)).toBeCloseTo(6.2, 5);
  });
});

describe('errorRateColor', () => {
  it('is green below 1%', () => {
    expect(errorRateColor(0)).toBe('#10b981');
    expect(errorRateColor(0.99)).toBe('#10b981');
  });

  it('is amber from 1% up to 5%', () => {
    expect(errorRateColor(1)).toBe('#f59e0b');
    expect(errorRateColor(4.9)).toBe('#f59e0b');
  });

  it('is red above 5%', () => {
    expect(errorRateColor(5.01)).toBe('#dc2626');
    expect(errorRateColor(100)).toBe('#dc2626');
  });
});

describe('formatPercent', () => {
  it('renders one decimal with a percent sign', () => {
    expect(formatPercent(6.234)).toBe('6.2%');
    expect(formatPercent(0)).toBe('0.0%');
  });
});

describe('truncateRoute', () => {
  it('returns the input untouched when within limit', () => {
    expect(truncateRoute('/api/short')).toBe('/api/short');
  });

  it('clips long inputs and adds an ellipsis', () => {
    const long = '/api/very/long/route/template/with/lots/of/segments/here';
    expect(truncateRoute(long, 32)).toHaveLength(32);
    expect(truncateRoute(long, 32).endsWith('…')).toBe(true);
  });
});

describe('formatBucketLabel', () => {
  const at = '2026-05-09T14:32:00.000Z';

  it('uses HH:mm for short windows', () => {
    expect(formatBucketLabel(at, '24h')).toMatch(/^\d{2}:\d{2}$/);
    expect(formatBucketLabel(at, '1h')).toMatch(/^\d{2}:\d{2}$/);
  });

  it('uses MMM D for the 7d window', () => {
    expect(formatBucketLabel(at, '7d')).toMatch(/^[A-Za-z]{3} \d{1,2}$/);
  });
});

describe('groupInboundByBucket', () => {
  it('groups status classes per bucket and fills missing classes with zero', () => {
    const points: OpsMetricsResponse['inbound_volume'] = [
      { bucket: '2026-05-09T14:00:00.000Z', status_class: '2xx', count: 100 },
      { bucket: '2026-05-09T14:00:00.000Z', status_class: '5xx', count: 3 },
      { bucket: '2026-05-09T14:05:00.000Z', status_class: '4xx', count: 7 },
    ];
    const result = groupInboundByBucket(points);
    expect(result).toEqual([
      {
        bucket: '2026-05-09T14:00:00.000Z',
        '2xx': 100,
        '3xx': 0,
        '4xx': 0,
        '5xx': 3,
      },
      {
        bucket: '2026-05-09T14:05:00.000Z',
        '2xx': 0,
        '3xx': 0,
        '4xx': 7,
        '5xx': 0,
      },
    ]);
  });
});

describe('formatBytes', () => {
  it('uses 1024-based consumer labels', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(850 * 1024)).toBe('850 KB');
    expect(formatBytes(Math.round(4.2 * 1024 * 1024))).toBe('4.2 MB');
    expect(formatBytes(Math.round(1.1 * 1024 * 1024 * 1024))).toBe('1.1 GB');
  });
});

describe('formatRatio', () => {
  it('renders a 0-1 ratio as a one-decimal percent and null as a dash', () => {
    expect(formatRatio(0.4231)).toBe('42.3%');
    expect(formatRatio(0)).toBe('0.0%');
    expect(formatRatio(null)).toBe('—');
  });
});

describe('groupOutboundByBucket', () => {
  it('produces one row per bucket with services as keys', () => {
    const points: OpsMetricsResponse['outbound_volume'] = [
      { bucket: '2026-05-09T14:00:00.000Z', service: 'notion', count: 12 },
      { bucket: '2026-05-09T14:00:00.000Z', service: 'claude', count: 4 },
      { bucket: '2026-05-09T15:00:00.000Z', service: 'notion', count: 9 },
    ];
    expect(groupOutboundByBucket(points)).toEqual([
      { bucket: '2026-05-09T14:00:00.000Z', notion: 12, claude: 4 },
      { bucket: '2026-05-09T15:00:00.000Z', notion: 9 },
    ]);
  });
});
