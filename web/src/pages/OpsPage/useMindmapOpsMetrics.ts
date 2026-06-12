import { useQuery } from '@tanstack/react-query';

import {
  MindmapImageStatsResponse,
  MindmapStorageMetricsResponse,
} from './mindmapOpsTypes';

const REFRESH_MS = 60_000;

const fetchJson = async <T>(path: string): Promise<T> => {
  const response = await fetch(path, { credentials: 'include' });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return response.json();
};

export const useMindmapImageStats = () => {
  return useQuery<MindmapImageStatsResponse, Error>({
    queryKey: ['ops-mindmap-image-stats'],
    queryFn: () =>
      fetchJson<MindmapImageStatsResponse>('/api/ops/mindmap/image-stats'),
    refetchInterval: REFRESH_MS,
    refetchOnWindowFocus: true,
  });
};

export const useMindmapStorageMetrics = () => {
  return useQuery<MindmapStorageMetricsResponse, Error>({
    queryKey: ['ops-mindmap-storage'],
    queryFn: () =>
      fetchJson<MindmapStorageMetricsResponse>('/api/ops/mindmap/storage'),
    refetchInterval: REFRESH_MS,
    refetchOnWindowFocus: true,
  });
};
