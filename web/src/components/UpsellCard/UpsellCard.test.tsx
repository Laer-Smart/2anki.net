import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { UpsellCard } from './UpsellCard';

const mockStartPassCheckout = vi.fn();

vi.mock('../../lib/backend/get2ankiApi', () => ({
  get2ankiApi: () => ({
    startPassCheckout: mockStartPassCheckout,
  }),
}));

const mockUseUserLocals = vi.fn();

vi.mock('../../lib/hooks/useUserLocals', () => ({
  useUserLocals: () => mockUseUserLocals(),
}));

const mockTrack = vi.fn();

vi.mock('../../lib/analytics/track', () => ({
  track: (...args: unknown[]) => mockTrack(...args),
}));

const freeUser = {
  data: {
    locals: { patreon: false, subscriber: false },
    user: { email: 'free@example.com' },
  },
};

const payingUser = {
  data: {
    locals: { patreon: false, subscriber: true },
    user: { email: 'paying@example.com' },
  },
};

const anonymousUser = { data: undefined };

describe('UpsellCard', () => {
  beforeEach(() => {
    mockTrack.mockClear();
    mockStartPassCheckout.mockReset();
  });

  it('renders three CTAs for free users', () => {
    mockUseUserLocals.mockReturnValue(freeUser);
    render(<UpsellCard surface="downloads_upsell" />);
    expect(screen.getByRole('button', { name: 'Day Pass' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Week Pass' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Unlimited' })).toBeInTheDocument();
  });

  it('renders nothing for paying users', () => {
    mockUseUserLocals.mockReturnValue(payingUser);
    const { container } = render(<UpsellCard surface="downloads_upsell" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders for anonymous users by default', () => {
    mockUseUserLocals.mockReturnValue(anonymousUser);
    render(<UpsellCard surface="downloads_upsell" />);
    expect(screen.getByRole('button', { name: 'Day Pass' })).toBeInTheDocument();
  });

  it('hides for anonymous users when hideForAnonymous is true', () => {
    mockUseUserLocals.mockReturnValue(anonymousUser);
    const { container } = render(
      <UpsellCard surface="upload_success_upsell" hideForAnonymous />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('still shows for free logged-in users when hideForAnonymous is true', () => {
    mockUseUserLocals.mockReturnValue(freeUser);
    render(<UpsellCard surface="upload_success_upsell" hideForAnonymous />);
    expect(screen.getByRole('button', { name: 'Day Pass' })).toBeInTheDocument();
  });

  it('uses the downloads surface headline on /downloads', () => {
    mockUseUserLocals.mockReturnValue(freeUser);
    render(<UpsellCard surface="downloads_upsell" />);
    expect(screen.getByText('Converting more this month?')).toBeInTheDocument();
  });

  it('uses the upload-success surface headline on upload success', () => {
    mockUseUserLocals.mockReturnValue(freeUser);
    render(<UpsellCard surface="upload_success_upsell" />);
    expect(screen.getByText('More pages to convert?')).toBeInTheDocument();
  });

  it('fires paywall_shown with the surface on mount for free users', () => {
    mockUseUserLocals.mockReturnValue(freeUser);
    render(<UpsellCard surface="downloads_upsell" />);
    expect(mockTrack).toHaveBeenCalledWith('paywall_shown', { surface: 'downloads_upsell' });
  });

  it('does not fire paywall_shown for paying users', () => {
    mockUseUserLocals.mockReturnValue(payingUser);
    render(<UpsellCard surface="downloads_upsell" />);
    expect(mockTrack).not.toHaveBeenCalled();
  });

  it('fires paywall_upgrade_clicked with plan=day_pass when Day Pass is clicked', async () => {
    mockUseUserLocals.mockReturnValue(freeUser);
    mockStartPassCheckout.mockResolvedValue({ url: 'https://checkout.stripe.com/day' });
    Object.defineProperty(globalThis, 'location', { writable: true, value: { href: '' } });

    render(<UpsellCard surface="downloads_upsell" />);
    fireEvent.click(screen.getByRole('button', { name: 'Day Pass' }));

    await waitFor(() => {
      expect(mockTrack).toHaveBeenCalledWith('paywall_upgrade_clicked', {
        surface: 'downloads_upsell',
        plan: 'day_pass',
      });
      expect(mockStartPassCheckout).toHaveBeenCalledWith('24h');
    });
  });

  it('fires paywall_upgrade_clicked with plan=week_pass when Week Pass is clicked', async () => {
    mockUseUserLocals.mockReturnValue(freeUser);
    mockStartPassCheckout.mockResolvedValue({ url: 'https://checkout.stripe.com/week' });
    Object.defineProperty(globalThis, 'location', { writable: true, value: { href: '' } });

    render(<UpsellCard surface="upload_success_upsell" />);
    fireEvent.click(screen.getByRole('button', { name: 'Week Pass' }));

    await waitFor(() => {
      expect(mockTrack).toHaveBeenCalledWith('paywall_upgrade_clicked', {
        surface: 'upload_success_upsell',
        plan: 'week_pass',
      });
      expect(mockStartPassCheckout).toHaveBeenCalledWith('7d');
    });
  });

  it('fires paywall_upgrade_clicked with plan=unlimited when Unlimited is clicked', () => {
    mockUseUserLocals.mockReturnValue(freeUser);
    render(<UpsellCard surface="downloads_upsell" />);
    fireEvent.click(screen.getByRole('link', { name: 'Unlimited' }));
    expect(mockTrack).toHaveBeenCalledWith('paywall_upgrade_clicked', {
      surface: 'downloads_upsell',
      plan: 'unlimited',
    });
  });

  it('shows Redirecting label and disables buttons while pass checkout is pending', async () => {
    mockUseUserLocals.mockReturnValue(freeUser);
    let resolveCheckout: (value: { status: 'error' }) => void = () => {};
    mockStartPassCheckout.mockReturnValue(
      new Promise((resolve) => {
        resolveCheckout = resolve;
      })
    );

    render(<UpsellCard surface="downloads_upsell" />);
    fireEvent.click(screen.getByRole('button', { name: 'Day Pass' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Redirecting…' })).toBeDisabled();
    });

    resolveCheckout({ status: 'error' });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Day Pass' })).toBeInTheDocument();
    });
  });
});
