import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import ReviewPanel from './ReviewPanel';
import { Backend, ReviewQueueCard } from '../../../lib/backend/Backend';
import { AnkifyStats } from '../stats/types';

const trackMock = vi.fn();
vi.mock('../../../lib/analytics/track', () => ({
  track: (...args: unknown[]) => trackMock(...args),
}));

const renderPanel = (backend: Backend) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ReviewPanel backend={backend} />
    </QueryClientProvider>
  );
};

const statsWithDeck = (review: number): AnkifyStats => ({
  connected: true,
  reviewedToday: 0,
  reviewedThisYear: 0,
  currentStreak: 0,
  longestStreak: 0,
  reviewsByDay: [],
  decks: [
    { name: 'Notion Sync::Pharma', new: 3, learning: 1, review, total: 120 },
  ],
});

const cards: ReviewQueueCard[] = [
  {
    cardId: 9001,
    questionHtml: '<p>Q1</p>',
    answerHtml: '<p>A1</p>',
    css: '',
  },
  {
    cardId: 9002,
    questionHtml: '<p>Q2</p>',
    answerHtml: '<p>A2</p>',
    css: '',
  },
];

const makeBackend = (overrides: Partial<Backend> = {}): Backend =>
  ({
    getAnkifyStats: vi.fn(async () => statsWithDeck(2)),
    getAnkifyReviewQueue: vi.fn(async () => ({
      connected: true as const,
      cards,
    })),
    gradeAnkifyReviewCard: vi.fn(async () => {}),
    ...overrides,
  }) as unknown as Backend;

beforeEach(() => {
  trackMock.mockClear();
});

describe('ReviewPanel', () => {
  test('runs front -> reveal -> grade -> next -> summary', async () => {
    const grade = vi.fn(async () => {});
    renderPanel(makeBackend({ gradeAnkifyReviewCard: grade }));

    const reviewButton = await screen.findByRole('button', { name: 'Review' });
    fireEvent.click(reviewButton);

    const showAnswer = await screen.findByRole('button', {
      name: 'Show answer',
    });
    expect(
      screen.queryByRole('button', { name: /Good/ })
    ).not.toBeInTheDocument();
    fireEvent.click(showAnswer);

    const good = await screen.findByRole('button', { name: /Good/ });
    fireEvent.click(good);

    await waitFor(() => expect(grade).toHaveBeenCalledWith(9001, 3));

    const showAnswer2 = await screen.findByRole('button', {
      name: 'Show answer',
    });
    fireEvent.click(showAnswer2);
    fireEvent.click(await screen.findByRole('button', { name: /Again/ }));

    await waitFor(() => expect(grade).toHaveBeenCalledWith(9002, 1));
    expect(await screen.findByText('2 cards. Done.')).toBeInTheDocument();
    expect(trackMock).toHaveBeenCalledWith(
      'ankify_review_session_started',
      expect.anything()
    );
    expect(trackMock).toHaveBeenCalledWith(
      'ankify_review_completed',
      expect.objectContaining({ graded: 2 })
    );
  });

  test('exits a review session back to the deck picker', async () => {
    renderPanel(makeBackend());

    fireEvent.click(await screen.findByRole('button', { name: 'Review' }));
    await screen.findByRole('button', { name: 'Show answer' });

    fireEvent.click(screen.getByRole('button', { name: 'Back to decks' }));

    expect(
      await screen.findByText(
        'Pick a deck to review its due cards without opening Anki.'
      )
    ).toBeInTheDocument();
    expect(trackMock).toHaveBeenCalledWith(
      'ankify_review_session_exited',
      expect.objectContaining({ deck: 'Notion Sync::Pharma', graded: 0 })
    );
  });

  test('shows the all-caught-up state when no cards are due', async () => {
    renderPanel(
      makeBackend({
        getAnkifyStats: vi.fn(async () => statsWithDeck(5)),
        getAnkifyReviewQueue: vi.fn(async () => ({
          connected: true as const,
          cards: [],
        })),
      })
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Review' }));

    expect(
      await screen.findByText(
        'All caught up. No cards due across your decks right now.'
      )
    ).toBeInTheDocument();
  });

  test('shows the offline state with Try again when the queue reports offline', async () => {
    const getAnkifyReviewQueue = vi.fn(async () => ({
      connected: false as const,
      reason: 'offline' as const,
    }));
    renderPanel(makeBackend({ getAnkifyReviewQueue }));

    fireEvent.click(await screen.findByRole('button', { name: 'Review' }));

    expect(
      await screen.findByText(
        "Anki isn't connected. Open Anki on your computer and try again."
      )
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(getAnkifyReviewQueue).toHaveBeenCalledTimes(2));
  });

  test('shows the error state with Try again when the queue reports error', async () => {
    const getAnkifyReviewQueue = vi.fn(async () => ({
      connected: false as const,
      reason: 'error' as const,
    }));
    renderPanel(makeBackend({ getAnkifyReviewQueue }));

    fireEvent.click(await screen.findByRole('button', { name: 'Review' }));

    expect(
      await screen.findByText(
        'Something broke while loading this deck. Try again in a moment.'
      )
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(getAnkifyReviewQueue).toHaveBeenCalledTimes(2));
  });

  test('shows the empty-decks state when stats has no decks', async () => {
    renderPanel(
      makeBackend({
        getAnkifyStats: vi.fn(async () => ({
          connected: true as const,
          reviewedToday: 0,
          reviewedThisYear: 0,
          currentStreak: 0,
          longestStreak: 0,
          reviewsByDay: [],
          decks: [],
        })),
      })
    );

    expect(
      await screen.findByText(
        'No decks to review yet. Sync a Notion page to start building cards.'
      )
    ).toBeInTheDocument();
  });

  test('disables the Review button for a deck with no due cards', async () => {
    renderPanel(
      makeBackend({ getAnkifyStats: vi.fn(async () => statsWithDeck(0)) })
    );

    const reviewButton = await screen.findByRole('button', { name: 'Review' });
    expect(reviewButton).toBeDisabled();
  });

  test('shows the offline state when Anki is not connected', async () => {
    renderPanel(
      makeBackend({
        getAnkifyStats: vi.fn(async () => ({ connected: false as const })),
      })
    );

    expect(
      await screen.findByText("Anki isn't connected.")
    ).toBeInTheDocument();
  });
});
