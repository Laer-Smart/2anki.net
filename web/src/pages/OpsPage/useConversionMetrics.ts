import { useQuery } from '@tanstack/react-query';

import { ConversionMetricsResponse } from './conversionTypes';

const REFRESH_MS = 30_000;

const fetchConversionMetrics = async (): Promise<ConversionMetricsResponse> => {
  const response = await fetch('/api/ops/conversion/metrics', {
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return response.json();
};

export const useConversionMetrics = () => {
  return useQuery<ConversionMetricsResponse, Error>({
    queryKey: ['ops-conversion-metrics'],
    queryFn: fetchConversionMetrics,
    refetchInterval: REFRESH_MS,
    refetchOnWindowFocus: true,
  });
};
