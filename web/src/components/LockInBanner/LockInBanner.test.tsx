import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LockInBanner } from './LockInBanner';

const mockGetCheckoutPrices = vi.fn();
const mockNavigate = vi.fn();

vi.mock('../../lib/backend/get2ankiApi', () => ({
  get2ankiApi: () => ({ getCheckoutPrices: mockGetCheckoutPrices }),
}));

vi.mock('../../lib/analytics/track', () => ({ track: vi.fn() }));

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>(
      'react-router-dom'
    );
  return { ...actual, useNavigate: () => mockNavigate };
});

const legacyInWindow = {
  cohort: 'legacy' as const,
  legacy: true,
  monthly: { cents: 600 },
  annual: { cents: 6000 },
  lockInDeadline: '2026-06-21T21:59:00.000Z',
};

const renderBanner = (isLoggedIn: boolean, isFree: boolean) =>
  render(
    <MemoryRouter>
      <LockInBanner isLoggedIn={isLoggedIn} isFree={isFree} />
    </MemoryRouter>
  );

beforeEach(() => {
  localStorage.clear();
  mockGetCheckoutPrices.mockReset();
  mockNavigate.mockReset();
});

afterEach(() => {
  localStorage.clear();
});

describe('LockInBanner', () => {
  it('shows the lock-in message for a logged-in free user inside the window', async () => {
    mockGetCheckoutPrices.mockResolvedValue(legacyInWindow);
    renderBanner(true, true);

    expect(
      await screen.findByText(/Lock in \$6\/month by Sunday 21 June/)
    ).toBeInTheDocument();
  });

  it('does not render when the user is not logged in', async () => {
    mockGetCheckoutPrices.mockResolvedValue(legacyInWindow);
    renderBanner(false, true);

    await waitFor(() => expect(mockGetCheckoutPrices).not.toHaveBeenCalled());
    expect(screen.queryByText(/Lock in/)).not.toBeInTheDocument();
  });

  it('does not render for a paying user', async () => {
    mockGetCheckoutPrices.mockResolvedValue(legacyInWindow);
    renderBanner(true, false);

    await waitFor(() => expect(mockGetCheckoutPrices).not.toHaveBeenCalled());
    expect(screen.queryByText(/Lock in/)).not.toBeInTheDocument();
  });

  it('does not render when prices come back as v2 (flag off or outside window)', async () => {
    mockGetCheckoutPrices.mockResolvedValue({
      cohort: 'v2',
      legacy: false,
      monthly: { cents: 799 },
      annual: { cents: 6400 },
      lockInDeadline: null,
    });
    renderBanner(true, true);

    await waitFor(() => expect(mockGetCheckoutPrices).toHaveBeenCalled());
    expect(screen.queryByText(/Lock in/)).not.toBeInTheDocument();
  });

  it('navigates to /pricing when See plans is clicked', async () => {
    mockGetCheckoutPrices.mockResolvedValue(legacyInWindow);
    renderBanner(true, true);

    fireEvent.click(await screen.findByRole('button', { name: 'See plans' }));
    expect(mockNavigate).toHaveBeenCalledWith('/pricing');
  });

  it('dismisses and persists the dismissal', async () => {
    mockGetCheckoutPrices.mockResolvedValue(legacyInWindow);
    renderBanner(true, true);

    fireEvent.click(await screen.findByRole('button', { name: 'Dismiss' }));
    expect(localStorage.getItem('lockInBannerDismissed')).toBe('2026-06');
    expect(screen.queryByText(/Lock in/)).not.toBeInTheDocument();
  });

  it('stays hidden when already dismissed', async () => {
    localStorage.setItem('lockInBannerDismissed', '2026-06');
    mockGetCheckoutPrices.mockResolvedValue(legacyInWindow);
    renderBanner(true, true);

    await waitFor(() => expect(mockGetCheckoutPrices).not.toHaveBeenCalled());
    expect(screen.queryByText(/Lock in/)).not.toBeInTheDocument();
  });
});
