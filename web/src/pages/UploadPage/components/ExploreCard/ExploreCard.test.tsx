import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { ExploreCard } from './ExploreCard';

const mockTrack = vi.fn();
vi.mock('../../../../lib/analytics/track', () => ({
  track: (...args: unknown[]) => mockTrack(...args),
}));

const mockUseUserLocals = vi.fn();
vi.mock('../../../../lib/hooks/useUserLocals', () => ({
  useUserLocals: () => mockUseUserLocals(),
}));

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

function renderCard(opts: { paying?: boolean; loading?: boolean }) {
  if (opts.loading) {
    mockUseUserLocals.mockReturnValue({ data: undefined });
  } else {
    mockUseUserLocals.mockReturnValue({
      data: {
        locals: {
          email: 'test@example.com',
          patreon: opts.paying ?? false,
          subscriptions: [],
        },
      },
    });
  }
  return render(
    <MemoryRouter>
      <ExploreCard />
    </MemoryRouter>
  );
}

describe('ExploreCard', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
    localStorageMock.clear();
    mockTrack.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the section heading and subtitle', () => {
    renderCard({ paying: false });
    expect(screen.getByRole('heading', { name: 'Beyond the defaults' })).toBeInTheDocument();
    expect(
      screen.getByText('Three things most people miss on their first upload.')
    ).toBeInTheDocument();
  });

  it('renders the three row titles', () => {
    renderCard({ paying: false });
    expect(screen.getByText('Card style')).toBeInTheDocument();
    expect(screen.getByText('Photo to deck')).toBeInTheDocument();
    expect(screen.getByText('Deck defaults')).toBeInTheDocument();
  });

  it('renders the card-style picker defaulting to Cloze', () => {
    renderCard({ paying: false });
    expect(screen.getByRole('radio', { name: 'Cloze' })).toHaveAttribute(
      'aria-checked',
      'true'
    );
    expect(screen.getByRole('radio', { name: 'Q&A' })).toHaveAttribute(
      'aria-checked',
      'false'
    );
  });

  it('writes selected card-style to localStorage when Q&A is clicked', () => {
    renderCard({ paying: false });
    fireEvent.click(screen.getByRole('radio', { name: 'Q&A' }));
    expect(localStorageMock.getItem('card-style')).toBe('qa');
    expect(screen.getByRole('radio', { name: 'Q&A' })).toHaveAttribute(
      'aria-checked',
      'true'
    );
  });

  it('reads the initial card-style from localStorage', () => {
    localStorageMock.setItem('card-style', 'qa');
    renderCard({ paying: false });
    expect(screen.getByRole('radio', { name: 'Q&A' })).toHaveAttribute(
      'aria-checked',
      'true'
    );
  });

  it('shows the free-plan hint for non-paying users', () => {
    renderCard({ paying: false });
    expect(screen.getByText('Free plan: 5 photos per month')).toBeInTheDocument();
  });

  it('hides the free-plan hint for paying users', () => {
    renderCard({ paying: true });
    expect(
      screen.queryByText('Free plan: 5 photos per month')
    ).not.toBeInTheDocument();
  });

  it('hides the free-plan hint while user-locals are loading', () => {
    renderCard({ loading: true });
    expect(
      screen.queryByText('Free plan: 5 photos per month')
    ).not.toBeInTheDocument();
  });

  it('links Photo to deck to /photo-to-deck', () => {
    renderCard({ paying: false });
    const link = screen.getByRole('link', { name: 'Open photo to deck' });
    expect(link).toHaveAttribute('href', '/photo-to-deck');
  });

  it('links Deck defaults to /card-options', () => {
    renderCard({ paying: false });
    const link = screen.getByRole('link', { name: 'Open settings' });
    expect(link).toHaveAttribute('href', '/card-options?returnTo=/upload');
  });

  it('fires photo_entry_point_viewed once on mount', () => {
    renderCard({ paying: false });
    expect(mockTrack).toHaveBeenCalledWith('photo_entry_point_viewed', {
      surface: 'upload_page',
    });
    expect(mockTrack).toHaveBeenCalledTimes(1);
  });

  it('fires photo_entry_point_clicked when the photo CTA is clicked', async () => {
    renderCard({ paying: false });
    mockTrack.mockClear();
    fireEvent.click(screen.getByRole('link', { name: 'Open photo to deck' }));
    await waitFor(() => {
      expect(mockTrack).toHaveBeenCalledWith('photo_entry_point_clicked', {
        surface: 'upload_page',
      });
    });
  });
});
