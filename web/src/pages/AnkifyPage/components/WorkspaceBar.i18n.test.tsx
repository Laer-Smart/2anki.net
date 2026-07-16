import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

import i18n from '../../../lib/i18n';
import WorkspaceBar from './WorkspaceBar';
import { Backend } from '../../../lib/backend/Backend';
import AnkifyClient from '../../../lib/interfaces/AnkifyClient';

vi.mock('../../../lib/analytics/track', () => ({
  track: vi.fn(),
}));

const sampleClient = (): AnkifyClient =>
  ({
    id: 7,
    status: 'active',
    session_url: 'https://session.example/abc',
    has_active_session: true,
  }) as unknown as AnkifyClient;

const makeBackend = (): Backend =>
  ({
    listAnkifyClients: vi.fn(async () => [sampleClient()]),
    checkAnkifyActiveClientReady: vi.fn(async () => ({ ready: true })),
    checkAnkifyAnkiWebStatus: vi.fn(async () => ({ status: 'linked' })),
    stopAnkifyClient: vi.fn(),
    respinAnkifyClient: vi.fn(),
    reissueAnkifySessionUrl: vi.fn(),
    getAnkifyActiveProfile: vi.fn(async () => null),
    syncAnkifyToAnkiWeb: vi.fn(async () => {}),
  }) as unknown as Backend;

const renderBar = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <WorkspaceBar backend={makeBackend()} title="Ankify" />
      </QueryClientProvider>
    </MemoryRouter>
  );
};

describe('WorkspaceBar in German', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('de');
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('renders the running status and session label in German', async () => {
    renderBar();
    await waitFor(() =>
      expect(screen.getByText('Anki läuft')).toBeInTheDocument()
    );
    expect(screen.getByText('Sitzung aktiv')).toBeInTheDocument();
  });
});
