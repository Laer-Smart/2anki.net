import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { cancelSubscriptionById } from '../../../lib/backend/cancelSubscription';

const PER_SUB_CANCEL_ERROR = "Couldn't cancel this plan. Try again.";

export function usePerSubscriptionCancellation(onSuccess?: () => void) {
  const [confirmingSubId, setConfirmingSubId] = useState<string | null>(null);
  const [errorSubId, setErrorSubId] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string>('');

  const { mutate, isPending: isCancelling } = useMutation({
    mutationFn: ({ id }: { id: string }) =>
      cancelSubscriptionById(id, 'immediate'),
    onSuccess: () => {
      setCancelError('');
      setErrorSubId(null);
      setConfirmingSubId(null);
      onSuccess?.();
    },
    onError: (_error, variables) => {
      setErrorSubId(variables.id);
      setCancelError(PER_SUB_CANCEL_ERROR);
    },
  });

  const openConfirm = (id: string) => {
    setCancelError('');
    setErrorSubId(null);
    setConfirmingSubId(id);
  };

  const dismissConfirm = () => {
    setConfirmingSubId(null);
  };

  const confirmCancel = (id: string) => {
    setCancelError('');
    setErrorSubId(null);
    mutate({ id });
  };

  return {
    confirmingSubId,
    errorSubId,
    cancelError,
    isCancelling,
    openConfirm,
    dismissConfirm,
    confirmCancel,
  };
}
