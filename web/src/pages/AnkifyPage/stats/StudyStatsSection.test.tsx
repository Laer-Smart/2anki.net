import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import StudyStatsSection from './StudyStatsSection';
import { Backend } from '../../../lib/backend/Backend';
import { AnkifyStats } from './types';

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

const makeBackend = (resolver: () => Promise<AnkifyStats>): Backend =>
  ({ getAnkifyStats: vi.fn(resolver) }) as unknown as Backend;

describe('StudyStatsSection', () => {
  test('shows the loading copy while the request is in flight', () => {
    const backend = makeBackend(() => new Promise(() => {}));
    renderSection(backend);
    expect(screen.getByText('Reading your stats from Anki')).toBeVisible();
  });

  test('shows the offline copy when not connected', async () => {
    const backend = makeBackend(async () => ({ connected: false }));
    renderSection(backend);
    await waitFor(() =>
      expect(screen.getByText(/Anki isn't connected right now/)).toBeVisible()
    );
  });

  test('shows the zero state when connected with no reviews', async () => {
    const backend = makeBackend(async () => ({
      connected: true,
      reviewedToday: 0,
      reviewedThisYear: 0,
      currentStreak: 0,
      longestStreak: 0,
      reviewsByDay: [],
      decks: [],
    }));
    renderSection(backend);
    await waitFor(() =>
      expect(
        screen.getByText(/No reviews yet. Open Anki and study a deck/)
      ).toBeVisible()
    );
    expect(screen.getByText('day streak')).toBeVisible();
  });

  test('renders heroes and the by-deck bar when data is present', async () => {
    const backend = makeBackend(async () => ({
      connected: true,
      reviewedToday: 12,
      reviewedThisYear: 3450,
      currentStreak: 6,
      longestStreak: 20,
      reviewsByDay: [{ date: '2026-06-12', count: 12 }],
      decks: [
        { name: 'Pharmacology', new: 5, learning: 2, review: 11, total: 120 },
      ],
    }));
    renderSection(backend);
    await waitFor(() => expect(screen.getByText('12')).toBeVisible());
    expect(screen.getByText('reviewed today')).toBeVisible();
    expect(screen.getByText('By deck')).toBeVisible();
    expect(screen.queryByText(/No reviews yet/)).not.toBeInTheDocument();
  });
});
