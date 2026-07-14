import { useCallback, useEffect, useState } from 'react';
import { CustomerSignalsResponse } from './customerSignalsTypes';

const ALLOWED_WINDOWS = ['7d', '14d', '30d', '60d', '90d'] as const;
type SignalsWindow = (typeof ALLOWED_WINDOWS)[number];

interface UseCustomerSignalsResult {
  data: CustomerSignalsResponse | null;
  loading: boolean;
  error: string | null;
  window: SignalsWindow;
  setWindow: (w: SignalsWindow) => void;
  refresh: () => void;
}

export const CUSTOMER_SIGNALS_WINDOWS: readonly SignalsWindow[] =
  ALLOWED_WINDOWS;

export function useCustomerSignals(): UseCustomerSignalsResult {
  const [data, setData] = useState<CustomerSignalsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentWindow, setCurrentWindow] = useState<SignalsWindow>('30d');
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/ops/growth/customer-signals?window=${currentWindow}`, {
      credentials: 'include',
    })
      .then((res) => {
        if (!res.ok) {
          return res.json().then((body: { message?: string }) => {
            throw new Error(body.message ?? `${res.status} ${res.statusText}`);
          });
        }
        return res.json() as Promise<CustomerSignalsResponse>;
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
