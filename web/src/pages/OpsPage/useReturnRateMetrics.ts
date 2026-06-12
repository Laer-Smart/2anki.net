import { useQuery } from '@tanstack/react-query';

import { ReturnRateMetricsResponse } from './returnRateTypes';

const REFRESH_MS = 60_000;

const fetchReturnRateMetrics = async (): Promise<ReturnRateMetricsResponse> => {
  const response = await fetch('/api/ops/return-rate/metrics', {
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return response.json();
};

export const useReturnRateMetrics = () => {
  return useQuery<ReturnRateMetricsResponse, Error>({
    queryKey: ['ops-return-rate-metrics'],
    queryFn: fetchReturnRateMetrics,
    refetchInterval: REFRESH_MS,
    refetchOnWindowFocus: true,
  });
};
