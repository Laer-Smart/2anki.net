import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, patch, del } from '../../lib/backend/api';

export interface MindmapNode {
  id: string;
  label: string;
  position?: { x: number; y: number };
}

export interface MindmapEdge {
  source: string;
  target: string;
}

export interface MindmapData {
  nodes: MindmapNode[];
  edges: MindmapEdge[];
}

export interface Mindmap {
  id: string;
  user_id: number;
  title: string;
  data: MindmapData;
  created_at: string;
  updated_at: string;
}

export interface MindmapAccessInfo {
  hasUnlimited: boolean;
  currentCount: number;
  freeMapLimit: number;
  maxNodesPerMap: number;
}

export interface ListMindmapsResult {
  maps: Mindmap[];
  access: MindmapAccessInfo;
}

const QUERY_KEY = 'mindmaps';

export function useMindmapList() {
  return useQuery<ListMindmapsResult>({
    queryKey: [QUERY_KEY],
    queryFn: () => get('/api/mindmaps'),
  });
}

export function useMindmapById(id: string | null) {
  return useQuery<Mindmap>({
    queryKey: [QUERY_KEY, id],
    queryFn: () => get(`/api/mindmaps/${id}`),
    enabled: id != null,
  });
}

export function useCreateMindmap() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (title: string) =>
      post('/api/mindmaps', { title }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

export function useUpdateMindmap(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (updates: { title?: string; data?: MindmapData }) =>
      patch(`/api/mindmaps/${id}`, updates).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, id] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

export function useDeleteMindmap() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/api/mindmaps/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

export type MindmapCardType = 'basic' | 'cloze' | 'markmap';

export async function exportMindmap(
  id: string,
  deckName: string,
  cardType: MindmapCardType = 'cloze'
): Promise<Blob> {
  const response = await fetch(`/api/mindmaps/${id}/export`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deck_name: deckName, card_type: cardType }),
  });
  if (!response.ok) {
    throw new Error(`Export failed: ${response.statusText}`);
  }
  return response.blob();
}
