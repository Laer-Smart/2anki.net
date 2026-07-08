import { useQuery } from '@tanstack/react-query';

import { MindmapStorageMetricsResponse } from './mindmapOpsTypes';

const fetchMindmapStorage =
  async (): Promise<MindmapStorageMetricsResponse> => {
    const response = await fetch('/api/ops/mindmap/storage', {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }
    return response.json();
  };

export const useMindmapStorage = () => {
  return useQuery<MindmapStorageMetricsResponse, Error>({
    queryKey: ['ops-mindmap-storage'],
    queryFn: fetchMindmapStorage,
    refetchInterval: false,
    refetchOnWindowFocus: false,
  });
};
