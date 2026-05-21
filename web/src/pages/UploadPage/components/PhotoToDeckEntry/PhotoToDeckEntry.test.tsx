import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { PhotoToDeckEntry } from './PhotoToDeckEntry';

const mockTrack = vi.fn();
vi.mock('../../../../lib/analytics/track', () => ({
  track: (...args: unknown[]) => mockTrack(...args),
}));

const mockUseUserLocals = vi.fn();
vi.mock('../../../../lib/hooks/useUserLocals', () => ({
  useUserLocals: () => mockUseUserLocals(),
}));

function renderEntry(opts: { paying?: boolean; loading?: boolean }) {
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
      <PhotoToDeckEntry />
    </MemoryRouter>
  );
}

describe('PhotoToDeckEntry', () => {
  beforeEach(() => {
    mockTrack.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the headline and CTA', () => {
    renderEntry({ paying: false });
    expect(screen.getByText('Try photo to deck')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Snap a textbook page, lecture slide, or handwritten notes — we\'ll make the cards.'
      )
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open photo to deck' })).toBeInTheDocument();
  });

  it('shows the free-plan hint for non-paying users', () => {
    renderEntry({ paying: false });
    expect(screen.getByText('Free plan: 5 photos per month')).toBeInTheDocument();
  });

  it('hides the free-plan hint for paying users', () => {
    renderEntry({ paying: true });
    expect(screen.queryByText('Free plan: 5 photos per month')).not.toBeInTheDocument();
  });

  it('hides the free-plan hint while user-locals are loading', () => {
    renderEntry({ loading: true });
    expect(screen.queryByText('Free plan: 5 photos per month')).not.toBeInTheDocument();
  });

  it('fires photo_entry_point_viewed once on mount', () => {
    renderEntry({ paying: false });
    expect(mockTrack).toHaveBeenCalledWith('photo_entry_point_viewed', {
      surface: 'upload_page',
    });
    expect(mockTrack).toHaveBeenCalledTimes(1);
  });

  it('fires photo_entry_point_clicked when CTA is clicked', async () => {
    renderEntry({ paying: false });
    mockTrack.mockClear();
    fireEvent.click(screen.getByRole('link', { name: 'Open photo to deck' }));
    await waitFor(() => {
      expect(mockTrack).toHaveBeenCalledWith('photo_entry_point_clicked', {
        surface: 'upload_page',
      });
    });
  });

  it('CTA links to /photo-to-deck', () => {
    renderEntry({ paying: false });
    const link = screen.getByRole('link', { name: 'Open photo to deck' });
    expect(link).toHaveAttribute('href', '/photo-to-deck');
  });
});
