import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { ApkgPreviewBatch, ApkgPreviewMeta } from '../../lib/backend/getApkgPreview';
import { getSharedDeckBatch, getSharedDeckMeta } from '../../lib/backend/getSharedDeck';

export function useSharedDeckMeta(token: string | undefined) {
  return useQuery<ApkgPreviewMeta, Error>({
    queryKey: ['sharedDeckMeta', token],
    enabled: token != null && token.length > 0,
    queryFn: () => getSharedDeckMeta(token as string),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export function useSharedDeckStream(
  token: string | undefined,
  deckId: number | null = null
) {
  return useInfiniteQuery<ApkgPreviewBatch, Error>({
    queryKey: ['sharedDeck', token, deckId],
    enabled: token != null && token.length > 0,
    initialPageParam: null,
    queryFn: ({ pageParam }) =>
      getSharedDeckBatch(token as string, pageParam as number | null, { deckId }),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
