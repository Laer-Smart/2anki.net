import { useCallback, useEffect, useState } from 'react';
import { UploadFunnelResponse } from './uploadFunnelTypes';

const ALLOWED_WINDOWS = ['7d', '14d', '30d', '60d', '90d'] as const;
type FunnelWindow = (typeof ALLOWED_WINDOWS)[number];

interface UseUploadFunnelResult {
  data: UploadFunnelResponse | null;
  loading: boolean;
  error: string | null;
  window: FunnelWindow;
  setWindow: (w: FunnelWindow) => void;
  refresh: () => void;
}

export const UPLOAD_FUNNEL_WINDOWS: readonly FunnelWindow[] = ALLOWED_WINDOWS;

export function useUploadFunnel(): UseUploadFunnelResult {
  const [data, setData] = useState<UploadFunnelResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentWindow, setCurrentWindow] = useState<FunnelWindow>('30d');
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/ops/upload-funnel?window=${currentWindow}`, {
      credentials: 'include',
    })
      .then((res) => {
        if (!res.ok) {
          return res.json().then((body: { message?: string }) => {
            throw new Error(body.message ?? `${res.status} ${res.statusText}`);
          });
        }
        return res.json() as Promise<UploadFunnelResponse>;
      })
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unknown error');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentWindow, tick]);

  return {
    data,
    loading,
    error,
    window: currentWindow,
    setWindow: setCurrentWindow,
    refresh,
  };
}
