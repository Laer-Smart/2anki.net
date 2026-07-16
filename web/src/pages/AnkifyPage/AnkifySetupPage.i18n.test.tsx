import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

import i18n from '../../lib/i18n';
import AnkifySetupPage from './AnkifySetupPage';
import { Backend } from '../../lib/backend/Backend';

const makeBackend = (): Backend =>
  ({
    listAnkifyClients: vi.fn(async () => []),
    provisionAnkifyClient: vi.fn(),
    respinAnkifyClient: vi.fn(),
    reissueAnkifySessionUrl: vi.fn(),
    checkAnkifyActiveClientReady: vi.fn(async () => ({ ready: false })),
    checkAnkifyAnkiWebStatus: vi.fn(async () => ({ status: 'unlinked' })),
  }) as unknown as Backend;

const renderSetup = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <AnkifySetupPage backend={makeBackend()} />
      </QueryClientProvider>
    </MemoryRouter>
  );
};

describe('AnkifySetupPage in German', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('de');
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('renders the takeover title and start-Anki step in German', async () => {
    renderSetup();
    await waitFor(() =>
      expect(
        screen.getByRole('heading', {
          name: 'Richte Anki in deinem Browser ein.',
        })
      ).toBeInTheDocument()
    );
    expect(
      screen.getByRole('button', { name: 'Anki starten' })
    ).toBeInTheDocument();
  });
});
