import { useCallback, useEffect, useState } from 'react';
import { PricingAbFunnelResponse } from './pricingAbTypes';

const ALLOWED_WINDOWS = ['7d', '14d', '30d', '60d', '90d'] as const;
type FunnelWindow = (typeof ALLOWED_WINDOWS)[number];

interface UsePricingAbFunnelResult {
  data: PricingAbFunnelResponse | null;
  loading: boolean;
  error: string | null;
  window: FunnelWindow;
  setWindow: (w: FunnelWindow) => void;
  refresh: () => void;
}

export const FUNNEL_WINDOWS: readonly FunnelWindow[] = ALLOWED_WINDOWS;

export function usePricingAbFunnel(): UsePricingAbFunnelResult {
  const [data, setData] = useState<PricingAbFunnelResponse | null>(null);
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

    fetch(`/api/ops/pricing-ab/funnel?window=${currentWindow}`, {
      credentials: 'include',
    })
      .then((res) => {
        if (!res.ok) {
          return res.json().then((body: { message?: string }) => {
            throw new Error(body.message ?? `${res.status} ${res.statusText}`);
          });
        }
        return res.json() as Promise<PricingAbFunnelResponse>;
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
