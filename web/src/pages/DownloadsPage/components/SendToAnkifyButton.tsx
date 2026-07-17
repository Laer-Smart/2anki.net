import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { get2ankiApi } from '../../../lib/backend/get2ankiApi';
import { useUserLocals } from '../../../lib/hooks/useUserLocals';

interface Props {
  readonly uploadId: number | string;
  readonly filename: string | null;
}

export default function SendToAnkifyButton({ uploadId, filename }: Props) {
  const { t } = useTranslation('downloadsx');
  const { data } = useUserLocals();
  const hasAccess =
    data?.locals?.patreon === true || data?.autoSyncActive === true;
  const api = get2ankiApi();

  const { data: clients } = useQuery({
    queryKey: ['ankify-clients'],
    queryFn: () => api.listAnkifyClients(),
    enabled: hasAccess,
  });

  const dispatch = useMutation({
    mutationFn: () => api.dispatchUploadToAnkify(Number(uploadId)),
  });

  if (!hasAccess) {
    return null;
  }

  const hasActive = (clients ?? []).some((c) => c.status === 'active');
  const disabled = dispatch.isPending || !hasActive;

  const label = (() => {
    if (dispatch.isPending) return t('ankify.sending');
    if (dispatch.isSuccess) {
      const result = dispatch.data;
      const parts = [];
      if (result.created > 0)
        parts.push(t('ankify.createdCount', { count: result.created }));
      if (result.updated > 0)
        parts.push(t('ankify.updatedCount', { count: result.updated }));
      const counts = parts.length > 0 ? parts.join(', ') : t('ankify.sent');
      let sync = '';
      if (result.anki_web_sync === 'synced') {
        sync = ` · ${t('ankify.syncedToAnkiWeb')}`;
      } else if (result.anki_web_sync === 'failed') {
        sync = ` · ${t('ankify.syncSkipped')}`;
      }
      return `${counts}${sync}`;
    }
    if (dispatch.isError) return t('ankify.tryAgain');
    return t('ankify.sendToAnki');
  })();

  const title = (() => {
    if (!hasActive) return t('ankify.setupHint');
    if (dispatch.isError) return (dispatch.error as Error).message;
    if (dispatch.isSuccess && dispatch.data.anki_web_sync === 'failed') {
      return t('ankify.syncFailedTitle', {
        error: dispatch.data.anki_web_sync_error ?? '',
      });
    }
    return t('ankify.sendingTitle', {
      deck: filename ?? t('ankify.thisDeck'),
    });
  })();

  return (
    <button
      type="button"
      onClick={() => dispatch.mutate()}
      disabled={disabled}
      title={title}
      style={{
        background: 'var(--color-bg-primary)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: '0.25rem 0.75rem',
        fontSize: 'var(--text-sm)',
        color: 'var(--color-text-secondary)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );
}
