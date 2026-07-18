import { useQuery } from '@tanstack/react-query';

import { CancelFunnelResponse } from './cancelFunnelTypes';

const REFRESH_MS = 60_000;

const fetchCancelFunnel = async (): Promise<CancelFunnelResponse> => {
  const response = await fetch('/api/ops/cancel-funnel?window=30d', {
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return response.json();
};

export const useCancelFunnel = () => {
  return useQuery<CancelFunnelResponse, Error>({
    queryKey: ['ops-cancel-funnel'],
    queryFn: fetchCancelFunnel,
    refetchInterval: REFRESH_MS,
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: false,
  });
};
