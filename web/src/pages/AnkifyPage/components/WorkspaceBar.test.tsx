import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

import WorkspaceBar from './WorkspaceBar';
import { Backend } from '../../../lib/backend/Backend';
import AnkifyClient from '../../../lib/interfaces/AnkifyClient';

const sampleClient = (overrides: Partial<AnkifyClient> = {}): AnkifyClient =>
  ({
    id: 7,
    status: 'active',
    session_url: 'https://session.example/abc',
    has_active_session: true,
    ...overrides,
  }) as unknown as AnkifyClient;

const makeBackend = (overrides: Partial<Backend> = {}): Backend =>
  ({
    listAnkifyClients: vi.fn(async () => [sampleClient()]),
    checkAnkifyActiveClientReady: vi.fn(async () => ({ ready: true })),
    checkAnkifyAnkiWebStatus: vi.fn(async () => ({ status: 'linked' })),
    stopAnkifyClient: vi.fn(),
    respinAnkifyClient: vi.fn(),
    reissueAnkifySessionUrl: vi.fn(),
    ...overrides,
  }) as unknown as Backend;

const renderBar = (backend: Backend, props: { title?: string } = {}) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <WorkspaceBar backend={backend} {...props} />
      </QueryClientProvider>
    </MemoryRouter>
  );
};

describe('WorkspaceBar', () => {
  test('renders the title as an h1 when the title prop is passed', async () => {
    renderBar(makeBackend(), { title: 'Ankify' });

    await waitFor(() =>
      expect(
        screen.getByRole('heading', { level: 1, name: 'Ankify' })
      ).toBeInTheDocument()
    );
  });

  test('does not render an h1 when no title prop is passed', async () => {
    renderBar(makeBackend());

    await waitFor(() =>
      expect(
        screen.getByRole('link', { name: /open anki/i })
      ).toBeInTheDocument()
    );
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
  });

  test('exposes Open Anki, Restart, and Shut down as labelled controls', async () => {
    renderBar(makeBackend(), { title: 'Ankify' });

    await waitFor(() =>
      expect(
        screen.getByRole('link', { name: /open anki/i })
      ).toBeInTheDocument()
    );
    expect(
      screen.getAllByRole('button', { name: /restart anki/i }).length
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole('button', { name: /shut down anki/i }).length
    ).toBeGreaterThan(0);
  });

  test('shows "Session active" rather than the raw session URL', async () => {
    renderBar(makeBackend(), { title: 'Ankify' });

    await waitFor(() =>
      expect(screen.getByText('Session active')).toBeInTheDocument()
    );
    expect(
      screen.queryByText('https://session.example/abc')
    ).not.toBeInTheDocument();
  });
});
