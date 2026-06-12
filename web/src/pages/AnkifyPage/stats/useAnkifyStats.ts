import { useQuery } from '@tanstack/react-query';

import { Backend } from '../../../lib/backend/Backend';
import { AnkifyStats } from './types';

export function useAnkifyStats(backend: Backend) {
  return useQuery<AnkifyStats>({
    queryKey: ['ankify-stats'],
    queryFn: () => backend.getAnkifyStats(),
    refetchOnWindowFocus: false,
  });
}
