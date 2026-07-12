import { useCallback, useEffect, useState } from 'react';
import { LandingPageYieldResponse } from './landingPageYieldTypes';

const ALLOWED_WINDOWS = ['7d', '14d', '30d', '60d', '90d'] as const;
type YieldWindow = (typeof ALLOWED_WINDOWS)[number];

interface UseLandingPageYieldResult {
  data: LandingPageYieldResponse | null;
  loading: boolean;
  error: string | null;
  window: YieldWindow;
  setWindow: (w: YieldWindow) => void;
  refresh: () => void;
}

export const LANDING_PAGE_YIELD_WINDOWS: readonly YieldWindow[] =
  ALLOWED_WINDOWS;

export function useLandingPageYield(): UseLandingPageYieldResult {
  const [data, setData] = useState<LandingPageYieldResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentWindow, setCurrentWindow] = useState<YieldWindow>('30d');
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/ops/growth/landing-page-yield?window=${currentWindow}`, {
      credentials: 'include',
    })
      .then((res) => {
        if (!res.ok) {
          return res.json().then((body: { message?: string }) => {
            throw new Error(body.message ?? `${res.status} ${res.statusText}`);
          });
        }
        return res.json() as Promise<LandingPageYieldResponse>;
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
