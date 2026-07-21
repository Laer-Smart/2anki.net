import { useQuery } from '@tanstack/react-query';

import { PerformanceMetricsResponse } from './performanceTypes';

const REFRESH_MS = 30_000;

const fetchPerformanceMetrics =
  async (): Promise<PerformanceMetricsResponse> => {
    const response = await fetch('/api/ops/performance/metrics', {
      credentials: 'include',
      cache: 'no-store',
    });
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }
    const body = await response.text();
    if (body.trim() === '') {
      throw new Error('empty response body');
    }
    try {
      return JSON.parse(body) as PerformanceMetricsResponse;
    } catch {
      throw new Error('malformed response body');
    }
  };

export const usePerformanceMetrics = () => {
  return useQuery<PerformanceMetricsResponse, Error>({
    queryKey: ['ops-performance-metrics'],
    queryFn: fetchPerformanceMetrics,
    refetchInterval: REFRESH_MS,
    refetchOnWindowFocus: true,
  });
};
