import { useQuery } from '@tanstack/react-query';
import { ActiveShare } from '../../../lib/backend/getSharedDeck';

async function fetchActiveShares(): Promise<ActiveShare[]> {
  const response = await fetch('/api/shares', { credentials: 'include' });
  if (!response.ok) return [];
  return response.json() as Promise<ActiveShare[]>;
}

export function useActiveShares() {
  const { data } = useQuery<ActiveShare[]>({
    queryKey: ['activeShares'],
    queryFn: fetchActiveShares,
    staleTime: 30 * 1000,
  });
  return data ?? [];
}
