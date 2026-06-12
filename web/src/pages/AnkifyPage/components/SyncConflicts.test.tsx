import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

import SyncConflicts from './SyncConflicts';
import { Backend } from '../../../lib/backend/Backend';

type Conflict = Awaited<ReturnType<Backend['listAnkifyConflicts']>>[number];

const sampleConflict = (overrides: Partial<Conflict> = {}): Conflict => ({
  id: 7,
  source_id: 'block-id',
  anki_note_id: 1502298033753,
  kind: 'both_edited',
  notion_snapshot: { front: 'Notion front', back: 'Notion back' },
  anki_snapshot: { front: 'Anki front', back: 'Anki back' },
  created_at: new Date().toISOString(),
  ...overrides,
});

const makeBackend = (overrides: Partial<Backend> = {}): Backend =>
  ({
    listAnkifyConflicts: vi.fn(async () => [sampleConflict()]),
    listAnkifySubscriptions: vi.fn(async () => []),
    resolveAnkifyConflict: vi.fn(),
    openAnkifyConflictInAnki: vi.fn(async () => ({ opened: true })),
    ...overrides,
  }) as unknown as Backend;

const renderConflicts = (backend: Backend) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <SyncConflicts backend={backend} />
      </QueryClientProvider>
    </MemoryRouter>
  );
};

describe('SyncConflicts open in Anki', () => {
  test('clicking Open in Anki calls the backend with the conflict id', async () => {
    const open = vi.fn(async () => ({ opened: true }));
    const backend = makeBackend({ openAnkifyConflictInAnki: open });

    renderConflicts(backend);

    fireEvent.click(
      await screen.findByRole('button', { name: /open in anki/i })
    );

    await waitFor(() => expect(open).toHaveBeenCalledWith(7));
  });

  test('shows the offline message when the client is not connected', async () => {
    const backend = makeBackend({
      openAnkifyConflictInAnki: vi.fn(async () => ({ opened: false })),
    });

    renderConflicts(backend);

    fireEvent.click(
      await screen.findByRole('button', { name: /open in anki/i })
    );

    expect(
      await screen.findByText(
        /anki isn't connected right now\. open anki and try again\./i
      )
    ).toBeInTheDocument();
  });

  test('does not show the offline message on a successful open', async () => {
    const backend = makeBackend({
      openAnkifyConflictInAnki: vi.fn(async () => ({ opened: true })),
    });

    renderConflicts(backend);

    fireEvent.click(
      await screen.findByRole('button', { name: /open in anki/i })
    );

    await waitFor(() =>
      expect(backend.openAnkifyConflictInAnki).toHaveBeenCalled()
    );
    expect(
      screen.queryByText(/anki isn't connected right now/i)
    ).not.toBeInTheDocument();
  });
});
