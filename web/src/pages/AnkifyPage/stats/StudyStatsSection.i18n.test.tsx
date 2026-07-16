import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import i18n from '../../../lib/i18n';
import StudyStatsSection from './StudyStatsSection';
import { Backend } from '../../../lib/backend/Backend';
import { AnkifyStats } from './types';

const makeBackend = (resolver: () => Promise<AnkifyStats>): Backend =>
  ({ getAnkifyStats: vi.fn(resolver) }) as unknown as Backend;

const renderSection = (backend: Backend) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <StudyStatsSection backend={backend} />
    </QueryClientProvider>
  );
};

describe('StudyStatsSection in German', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('de');
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('renders the section heading and offline copy in German', async () => {
    renderSection(makeBackend(async () => ({ connected: false })));
    expect(
      screen.getByRole('heading', { name: 'Deine Wiederholungen' })
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.getByText(/Anki ist gerade nicht verbunden/i)
      ).toBeInTheDocument()
    );
  });
});
