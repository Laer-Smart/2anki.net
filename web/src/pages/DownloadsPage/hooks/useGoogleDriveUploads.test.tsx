import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import Backend, { GoogleDriveUpload } from '../../../lib/backend';
import useGoogleDriveUploads from './useGoogleDriveUploads';

function makeRow(
  overrides: Partial<GoogleDriveUpload> = {}
): GoogleDriveUpload {
  return {
    id: 'abc',
    iconUrl: 'https://drive-thirdparty.googleusercontent.com/16/type/pdf',
    mimeType: 'application/pdf',
    name: 'biology.pdf',
    sizeBytes: '2457600',
    url: 'https://drive.google.com/file/d/abc/view',
    last_converted_at: '2026-05-14T00:00:00Z',
    ...overrides,
  };
}

function makeBackend(overrides: Partial<Backend> = {}): Backend {
  return {
    getGoogleDriveUploads: vi.fn().mockResolvedValue([]),
    deleteGoogleDriveUpload: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as Backend;
}

describe('useGoogleDriveUploads', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('starts in loading state, then renders empty list', async () => {
    const backend = makeBackend();
    const { result } = renderHook(() => useGoogleDriveUploads(backend));

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.uploads).toEqual([]);
    expect(result.current.hasMore).toBe(false);
    expect(result.current.error).toBe(false);
  });

  it('renders populated list and exposes hasMore when page is full', async () => {
    const rows = Array.from({ length: 10 }, (_, i) =>
      makeRow({ id: `row-${i}`, name: `file-${i}.pdf` })
    );
    const backend = makeBackend({
      getGoogleDriveUploads: vi.fn().mockResolvedValue(rows),
    } as Partial<Backend>);
    const { result } = renderHook(() => useGoogleDriveUploads(backend));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.uploads).toHaveLength(10);
    expect(result.current.hasMore).toBe(true);
  });

  it('sets error when backend throws', async () => {
    const backend = makeBackend({
      getGoogleDriveUploads: vi.fn().mockRejectedValue(new Error('boom')),
    } as Partial<Backend>);
    const { result } = renderHook(() => useGoogleDriveUploads(backend));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(true);
  });

  it('deleteUpload removes the row by string id', async () => {
    const initial = [makeRow({ id: 'keep' }), makeRow({ id: 'remove-me' })];
    const deleteSpy = vi.fn().mockResolvedValue(undefined);
    const backend = makeBackend({
      getGoogleDriveUploads: vi.fn().mockResolvedValue(initial),
      deleteGoogleDriveUpload: deleteSpy,
    } as Partial<Backend>);
    const { result } = renderHook(() => useGoogleDriveUploads(backend));

    await waitFor(() => expect(result.current.uploads).toHaveLength(2));
    await act(async () => {
      await result.current.deleteUpload('remove-me');
    });

    expect(deleteSpy).toHaveBeenCalledWith('remove-me');
    expect(result.current.uploads.map((u) => u.id)).toEqual(['keep']);
  });
});
