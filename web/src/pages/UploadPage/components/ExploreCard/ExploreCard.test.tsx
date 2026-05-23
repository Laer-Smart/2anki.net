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
    mockTrack.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the section heading and subtitle', () => {
    renderCard({ paying: false });
    expect(screen.getByRole('heading', { name: 'Beyond the defaults' })).toBeInTheDocument();
    expect(
      screen.getByText('How serious Anki users build decks faster.')
    ).toBeInTheDocument();
  });

  it('renders the three row titles', () => {
    renderCard({ paying: false });
    expect(screen.getByText('Multiple choice questions (MCQ)')).toBeInTheDocument();
    expect(screen.getByText('Photo to deck')).toBeInTheDocument();
    expect(screen.getByText('Deck defaults')).toBeInTheDocument();
  });

  it('describes MCQ as available via photo and chat', () => {
    renderCard({ paying: false });
    expect(
      screen.getByText(/MCQ alongside standard cards/i)
    ).toBeInTheDocument();
  });

  it('mentions generate-vs-copy modes in the Photo to deck row', () => {
    renderCard({ paying: false });
    expect(
      screen.getByText(/generate new cards or copy questions already on the page/i)
    ).toBeInTheDocument();
  });

  it('mentions cloze and Q&A in the Deck defaults row', () => {
    renderCard({ paying: false });
    expect(
      screen.getByText(/card style \(cloze or Q&A\)/i)
    ).toBeInTheDocument();
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

  it('links Multiple choice to settings #mcq anchor', () => {
    renderCard({ paying: false });
    const link = screen.getByRole('link', { name: 'Turn on MCQ' });
    expect(link).toHaveAttribute('href', '/card-options?returnTo=/upload#mcq');
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
