import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';

const { mockGet, mockPost, mockPatch, mockDel } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockPatch: vi.fn(),
  mockDel: vi.fn(),
}));

vi.mock('../../lib/backend/api', () => ({
  get: mockGet,
  post: mockPost,
  patch: mockPatch,
  del: mockDel,
}));

import { useMindmapList } from './useMindmap';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useMindmapList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns maps and access block from server response', async () => {
    const serverResponse = {
      maps: [
        {
          id: 'uuid-1',
          user_id: 42,
          title: 'Anatomy',
          data: { nodes: [], edges: [] },
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
      ],
      access: {
        hasUnlimited: false,
        currentCount: 1,
        freeMapLimit: 3,
        maxNodesPerMap: 50,
      },
    };
    mockGet.mockResolvedValue(serverResponse);

    const { result } = renderHook(() => useMindmapList(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.maps).toHaveLength(1);
    expect(result.current.data?.access.freeMapLimit).toBe(3);
    expect(result.current.data?.access.maxNodesPerMap).toBe(50);
    expect(result.current.data?.access.hasUnlimited).toBe(false);
  });

  it('calls the correct API endpoint', async () => {
    mockGet.mockResolvedValue({ maps: [], access: { hasUnlimited: false, currentCount: 0, freeMapLimit: 3, maxNodesPerMap: 50 } });

    renderHook(() => useMindmapList(), { wrapper: createWrapper() });

    await waitFor(() => expect(mockGet).toHaveBeenCalledWith('/api/mindmaps'));
  });
});
