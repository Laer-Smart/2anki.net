import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import i18n from '../../../lib/i18n';
import ReviewPanel from './ReviewPanel';
import { Backend } from '../../../lib/backend/Backend';

vi.mock('../../../lib/analytics/track', () => ({
  track: vi.fn(),
}));

const makeBackend = (): Backend =>
  ({
    getAnkifyStats: vi.fn(async () => ({
      connected: true as const,
      reviewedToday: 0,
      reviewedThisYear: 0,
      currentStreak: 0,
      longestStreak: 0,
      reviewsByDay: [],
      decks: [
        {
          fullName: 'Notion Sync::Pharma',
          name: 'Pharma',
          depth: 1,
          new: 3,
          learning: 1,
          review: 4,
          total: 120,
        },
      ],
    })),
  }) as unknown as Backend;

const renderPanel = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ReviewPanel backend={makeBackend()} />
    </QueryClientProvider>
  );
};

describe('ReviewPanel in German', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('de');
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('renders the deck picker helper and review button in German', async () => {
    renderPanel();
    await waitFor(() =>
      expect(
        screen.getByText(/Wähle einen Stapel, um seine fälligen/i)
      ).toBeInTheDocument()
    );
    expect(
      screen.getByRole('button', { name: 'Wiederholen' })
    ).toBeInTheDocument();
  });
});
