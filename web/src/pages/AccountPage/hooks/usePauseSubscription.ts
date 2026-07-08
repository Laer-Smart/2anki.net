import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  pauseSubscription,
  resumeSubscription,
  PauseMonths,
} from '../../../lib/backend/pauseSubscription';

export function usePauseSubscription(onSuccess?: () => void) {
  const [pauseError, setPauseError] = useState<string>('');
  const [resumeError, setResumeError] = useState<string>('');

  const pause = useMutation({
    mutationFn: ({ months }: { months: PauseMonths }) =>
      pauseSubscription(months),
    onSuccess: () => {
      setPauseError('');
      onSuccess?.();
    },
    onError: (error: Error) => {
      setPauseError(error?.message || 'Failed to pause subscription');
    },
  });

  const resume = useMutation({
    mutationFn: () => resumeSubscription(),
    onSuccess: () => {
      setResumeError('');
      onSuccess?.();
    },
    onError: (error: Error) => {
      setResumeError(error?.message || 'Failed to resume subscription');
    },
  });

  return {
    pauseSubscriptionForMonths: (months: PauseMonths) => {
      setPauseError('');
      pause.mutate({ months });
    },
    resumeSubscriptionNow: () => {
      setResumeError('');
      resume.mutate();
    },
    isPausing: pause.isPending,
    isResuming: resume.isPending,
    pauseError,
    resumeError,
  };
}
