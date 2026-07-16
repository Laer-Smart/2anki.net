import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

import i18n from '../../../lib/i18n';
import NotionSubscriptions from './NotionSubscriptions';
import { Backend } from '../../../lib/backend/Backend';

vi.mock('../../../lib/analytics/track', () => ({
  track: vi.fn(),
}));

type Subscription = Awaited<
  ReturnType<Backend['listAnkifySubscriptions']>
>[number];

const sampleSubscription = (): Subscription => ({
  id: 1,
  notion_page_id: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  notion_page_title: 'My deck',
  notion_page_url: 'https://notion.so/My-deck',
  notion_page_icon: null,
  target_deck: null,
  enabled: true,
  last_polled_at: null,
  last_synced_at: new Date().toISOString(),
  last_error: null,
});

const makeBackend = (): Backend =>
  ({
    listAnkifySubscriptions: vi.fn(async () => [sampleSubscription()]),
    deleteAnkifySubscription: vi.fn(),
    subscribeAnkifyNotionPage: vi.fn(),
    searchTopLevelPages: vi.fn(async () => []),
    getAnkifyStats: vi.fn(async () => ({ connected: false }) as const),
    getAnkifyDeckMaturity: vi.fn(async () => ({ connected: false }) as const),
    listAnkifyLeeches: vi.fn(async () => ({
      connected: false as const,
      reason: 'offline' as const,
    })),
  }) as unknown as Backend;

const renderSubs = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <NotionSubscriptions backend={makeBackend()} />
      </QueryClientProvider>
    </MemoryRouter>
  );
};

describe('NotionSubscriptions in German', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('de');
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('renders the poll-interval helper and find-pages tab in German', async () => {
    renderSubs();
    await waitFor(() =>
      expect(
        screen.getByText('Prüft Notion alle 5 Minuten auf Änderungen.')
      ).toBeInTheDocument()
    );
    expect(
      screen.getByRole('tab', { name: 'Seiten finden' })
    ).toBeInTheDocument();
  });
});
