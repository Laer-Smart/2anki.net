import { useEffect, useState } from 'react';
import {
  ErrorGroupsResponse,
  ErrorSort,
  ErrorSource,
  ErrorStatus,
} from './errorsTypes';

interface UseErrorGroupsOptions {
  limit?: number;
  offset?: number;
  source: ErrorSource;
  sort: ErrorSort;
  status: ErrorStatus;
}

interface UseErrorGroupsResult {
  data: ErrorGroupsResponse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useErrorGroups(
  options: UseErrorGroupsOptions
): UseErrorGroupsResult {
  const { limit = 50, offset = 0, source, sort, status } = options;
  const [data, setData] = useState<ErrorGroupsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
      sort,
      status,
    });
    if (source !== 'all') {
      params.set('source', source);
    }

    fetch(`/api/ops/errors?${params.toString()}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        return res.json() as Promise<ErrorGroupsResponse>;
      })
      .then((json) => {
        if (!cancelled) {
          setData(json);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [limit, offset, source, sort, status, tick]);

  return {
    data,
    isLoading,
    error,
    refetch: () => setTick((n) => n + 1),
  };
}
