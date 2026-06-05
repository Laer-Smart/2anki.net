import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import useNotionData from './useNotionData';
import Backend from '../../../lib/backend';

const buildBackend = (info: {
  isConnected?: boolean;
  link?: string;
  workspace?: string | null;
}) =>
  ({
    getNotionConnectionInfo: vi.fn().mockResolvedValue(info),
  }) as unknown as Backend;

describe('useNotionData', () => {
  it('treats a logged-in user with a token as connected', async () => {
    const backend = buildBackend({
      isConnected: true,
      link: 'https://api.notion.com/v1/oauth/authorize?client_id=abc',
      workspace: 'Pristine’s Notion',
    });

    const { result } = renderHook(() => useNotionData(backend));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.connected).toBe(true);
    expect(result.current.workSpace).toBe('Pristine’s Notion');
    expect(result.current.connectionLink).toContain('notion.com');
  });

  it('treats a logged-in user without a token as not connected, with a working OAuth link', async () => {
    const backend = buildBackend({
      isConnected: false,
      link: 'https://api.notion.com/v1/oauth/authorize?client_id=abc',
      workspace: null,
    });

    const { result } = renderHook(() => useNotionData(backend));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.connected).toBe(false);
    expect(result.current.connectionLink).toContain('notion.com');
  });

  it('does not default to "connected" when isConnected is missing — the connect button must stay visible', async () => {
    const backend = buildBackend({
      link: 'https://api.notion.com/v1/oauth/authorize?client_id=abc',
      workspace: null,
    });

    const { result } = renderHook(() => useNotionData(backend));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.connected).toBe(false);
    expect(result.current.connectionLink).toContain('notion.com');
  });

  it('falls back to an empty link when the request fails entirely', async () => {
    const backend = {
      getNotionConnectionInfo: vi.fn().mockRejectedValue(new Error('network')),
    } as unknown as Backend;

    const { result } = renderHook(() => useNotionData(backend));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.connected).toBe(false);
    expect(result.current.connectionLink).toBe('');
    expect(result.current.error).toBeDefined();
  });
});
