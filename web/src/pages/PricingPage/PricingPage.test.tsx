import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import PricingPage from './PricingPage';

const mockStartAutoSyncCheckout = vi.fn();
const mockRequestHostedAnkiAccess = vi.fn();
const mockStartPassCheckout = vi.fn();
const mockStartUnlimitedCheckout = vi.fn();

vi.mock('../../lib/backend/get2ankiApi', () => ({
  get2ankiApi: () => ({
    requestHostedAnkiAccess: mockRequestHostedAnkiAccess,
    startAutoSyncCheckout: mockStartAutoSyncCheckout,
    startPassCheckout: mockStartPassCheckout,
    startUnlimitedCheckout: mockStartUnlimitedCheckout,
  }),
}));

vi.mock('../../components/TopMessage/TopMessage', () => ({
  default: () => null,
}));

vi.mock('../../lib/analytics/track', () => ({
  track: vi.fn(),
}));

const mockUseCardUsage = vi.fn();

vi.mock('../../lib/hooks/useCardUsage', () => ({
  useCardUsage: () => mockUseCardUsage(),
}));

type AnalyticsGlobals = {
  hj?: ReturnType<typeof vi.fn>;
  gtag?: ReturnType<typeof vi.fn>;
};

const renderAt = (path: string, props: Partial<Parameters<typeof PricingPage>[0]> = {}) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <PricingPage isLoggedIn={false} {...props} />
    </MemoryRouter>
  );

describe('PricingPage Unlimited benefits', () => {
  it('lists parallel conversions as a benefit', () => {
    renderAt('/pricing');
    expect(screen.getByText('Run multiple conversions at once')).toBeInTheDocument();
  });

  it('shows Most popular badge on Unlimited card', () => {
    renderAt('/pricing');
    expect(screen.getByText('Most popular')).toBeInTheDocument();
  });
});

describe('PricingPage layout', () => {
  it('renders Unlimited and Auto Sync cards', () => {
    renderAt('/pricing');
    expect(screen.getByText('Unlimited')).toBeInTheDocument();
    expect(screen.getByText('Auto Sync')).toBeInTheDocument();
  });

  it('shows Lifetime card with From $345 price', () => {
    renderAt('/pricing');
    expect(screen.getByText('From $345')).toBeInTheDocument();
  });

  it('shows the Pay once section label', () => {
    renderAt('/pricing');
    expect(screen.getByText('Pay once — no subscription')).toBeInTheDocument();
  });

  it('shows the Monthly plans section label', () => {
    renderAt('/pricing');
    expect(screen.getByText('Monthly plans')).toBeInTheDocument();
  });

  it('shows the One-time payment section label above Lifetime', () => {
    renderAt('/pricing');
    expect(screen.getByText('One-time payment')).toBeInTheDocument();
  });

  it('shows Day Pass and Week Pass as full cards without an accordion', () => {
    const { container } = renderAt('/pricing');
    expect(screen.getByRole('button', { name: 'Get Day Pass' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Get Week Pass' })).toBeInTheDocument();
    expect(container.querySelector('details')).toBeNull();
  });

  it('shows philosophy line', () => {
    renderAt('/pricing');
    expect(
      screen.getByText('Free works forever. Paid plans support 2anki.net.')
    ).toBeInTheDocument();
  });
});

describe('PricingPage paywall telemetry', () => {
  beforeEach(() => {
    (globalThis as AnalyticsGlobals).hj = vi.fn();
    (globalThis as AnalyticsGlobals).gtag = vi.fn();
  });

  afterEach(() => {
    delete (globalThis as AnalyticsGlobals).hj;
    delete (globalThis as AnalyticsGlobals).gtag;
  });

  it('fires paywall_pricing_viewed when source=paywall-cancel', () => {
    renderAt('/pricing?source=paywall-cancel');
    expect((globalThis as AnalyticsGlobals).hj).toHaveBeenCalledWith(
      'event',
      'paywall_pricing_viewed'
    );
    expect((globalThis as AnalyticsGlobals).gtag).toHaveBeenCalledWith(
      'event',
      'paywall_pricing_viewed'
    );
  });

  it('does not fire paywall_pricing_viewed without source=paywall-cancel', () => {
    renderAt('/pricing');
    expect((globalThis as AnalyticsGlobals).hj).not.toHaveBeenCalled();
    expect((globalThis as AnalyticsGlobals).gtag).not.toHaveBeenCalled();
  });
});

describe('PricingPage Auto Sync card', () => {
  it('shows Subscribe button for logged-in free user', () => {
    renderAt('/pricing', { isLoggedIn: true });
    expect(screen.getByRole('button', { name: 'Subscribe' })).toBeInTheDocument();
  });

  it('shows New — built for Notion badge when Auto Sync is new', () => {
    renderAt('/pricing');
    expect(screen.getByText('New — built for Notion')).toBeInTheDocument();
  });

  it('redirects to login when logged-out user clicks Subscribe', () => {
    const originalHref = globalThis.location.href;
    Object.defineProperty(globalThis, 'location', {
      writable: true,
      value: { href: '' },
    });

    renderAt('/pricing', { isLoggedIn: false });
    fireEvent.click(screen.getByRole('button', { name: 'Subscribe' }));
    expect(globalThis.location.href).toBe('/login?redirect=/pricing');

    Object.defineProperty(globalThis, 'location', {
      writable: true,
      value: { href: originalHref },
    });
  });

  it('shows waitlist caption for waitlisted user', () => {
    renderAt('/pricing', { isLoggedIn: true, hostedAnkiRequested: true });
    expect(screen.getByText('Waitlist is open — subscribe anytime.')).toBeInTheDocument();
  });

  it('shows Included in Lifetime plan caption for patreon user and hides price', () => {
    renderAt('/pricing', { isLoggedIn: true, patreon: true });
    expect(screen.getByText('Included in your Lifetime plan')).toBeInTheDocument();
  });

  it('shows Join the waitlist when cap is reached', () => {
    renderAt('/pricing', { isLoggedIn: true, autoSyncCapReached: true });
    expect(screen.getByRole('button', { name: 'Join the waitlist' })).toBeInTheDocument();
  });

  it('shows the capacity caption when cap is reached', () => {
    renderAt('/pricing', { isLoggedIn: true, autoSyncCapReached: true });
    expect(
      screen.getByText("We're at capacity — we'll email you when a seat opens.")
    ).toBeInTheDocument();
  });

  it('surfaces an inline error when checkout fails instead of redirecting', async () => {
    mockStartAutoSyncCheckout.mockResolvedValue({ status: 'error' });
    const originalHref = globalThis.location.href;
    Object.defineProperty(globalThis, 'location', {
      writable: true,
      value: { href: originalHref },
    });

    renderAt('/pricing', { isLoggedIn: true });
    fireEvent.click(screen.getByRole('button', { name: 'Subscribe' }));

    await waitFor(() => {
      expect(
        screen.getByText("Couldn't start checkout. Try again, or email support@2anki.net.")
      ).toBeInTheDocument();
    });
    expect(globalThis.location.href).toBe(originalHref);
  });

  it('redirects to /ankify/setup when the user is already subscribed', async () => {
    mockStartAutoSyncCheckout.mockResolvedValue({ status: 'already_subscribed' });
    Object.defineProperty(globalThis, 'location', {
      writable: true,
      value: { href: '' },
    });

    renderAt('/pricing', { isLoggedIn: true });
    fireEvent.click(screen.getByRole('button', { name: 'Subscribe' }));

    await waitFor(() => {
      expect(globalThis.location.href).toBe('/ankify/setup');
    });
  });

  it('shows Subscribed (disabled) when user already has Auto Sync', () => {
    renderAt('/pricing', { isLoggedIn: true, autoSyncActive: true });
    const btn = screen.getByRole('button', { name: 'Subscribed' });
    expect(btn).toBeInTheDocument();
    expect(btn).toBeDisabled();
  });

  it('calls startAutoSyncCheckout and redirects on url response', async () => {
    mockStartAutoSyncCheckout.mockResolvedValue({ url: 'https://checkout.stripe.com/session' });
    Object.defineProperty(globalThis, 'location', {
      writable: true,
      value: { href: '' },
    });

    renderAt('/pricing', { isLoggedIn: true });
    fireEvent.click(screen.getByRole('button', { name: 'Subscribe' }));

    await waitFor(() => {
      expect(mockStartAutoSyncCheckout).toHaveBeenCalled();
      expect(globalThis.location.href).toBe('https://checkout.stripe.com/session');
    });
  });

  it('shows How sync works link', () => {
    renderAt('/pricing', { isLoggedIn: true });
    const link = screen.getByRole('link', { name: 'How sync works' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/documentation/sync/how-it-works');
  });
});

describe('PricingPage pricing honesty', () => {
  it('does not mention Anki desktop in browser anywhere on the page', () => {
    renderAt('/pricing');
    expect(screen.queryByText(/anki desktop in your browser/i)).not.toBeInTheDocument();
  });

  it('shows the 1,000-note cap on the free-plan import bullet (US copy)', () => {
    renderAt('/pricing', { signupCountry: 'US' });
    expect(screen.getByText(/1,000 notes/)).toBeInTheDocument();
  });

  it('shows the 1,000-note cap on the free-plan import bullet (non-US copy)', () => {
    renderAt('/pricing', { signupCountry: 'DE' });
    expect(screen.getByText(/1,000 notes/)).toBeInTheDocument();
  });
});

describe('PricingPage internal event tracking', () => {
  beforeEach(() => {
    mockUseCardUsage.mockReturnValue(null);
  });

  it('tracks paywall_shown with surface=pricing_page on mount', async () => {
    const { track } = await import('../../lib/analytics/track');
    const trackMock = vi.mocked(track);
    trackMock.mockClear();

    renderAt('/pricing');

    expect(trackMock).toHaveBeenCalledWith('paywall_shown', { surface: 'pricing_page' });
  });

  it('tracks paywall_upgrade_clicked with plan=auto_sync when Subscribe is clicked', async () => {
    const { track } = await import('../../lib/analytics/track');
    const trackMock = vi.mocked(track);
    trackMock.mockClear();
    mockStartAutoSyncCheckout.mockResolvedValue({ url: 'https://checkout.stripe.com/session' });
    Object.defineProperty(globalThis, 'location', { writable: true, value: { href: '' } });

    renderAt('/pricing', { isLoggedIn: true });
    fireEvent.click(screen.getByRole('button', { name: 'Subscribe' }));

    await waitFor(() => {
      expect(trackMock).toHaveBeenCalledWith('paywall_upgrade_clicked', {
        surface: 'pricing_page',
        plan: 'auto_sync',
      });
    });
  });

  it('tracks paywall_upgrade_clicked with plan=day_pass when Day Pass is clicked', async () => {
    const { track } = await import('../../lib/analytics/track');
    const trackMock = vi.mocked(track);
    trackMock.mockClear();
    mockStartPassCheckout.mockResolvedValue({ url: 'https://checkout.stripe.com/day' });
    Object.defineProperty(globalThis, 'location', { writable: true, value: { href: '' } });

    renderAt('/pricing', { isLoggedIn: true });
    fireEvent.click(screen.getByRole('button', { name: 'Get Day Pass' }));

    await waitFor(() => {
      expect(trackMock).toHaveBeenCalledWith('paywall_upgrade_clicked', {
        surface: 'pricing_page',
        plan: 'day_pass',
      });
    });
  });

  it('tracks paywall_upgrade_clicked with plan=week_pass when Week Pass is clicked', async () => {
    const { track } = await import('../../lib/analytics/track');
    const trackMock = vi.mocked(track);
    trackMock.mockClear();
    mockStartPassCheckout.mockResolvedValue({ url: 'https://checkout.stripe.com/week' });
    Object.defineProperty(globalThis, 'location', { writable: true, value: { href: '' } });

    renderAt('/pricing', { isLoggedIn: true });
    fireEvent.click(screen.getByRole('button', { name: 'Get Week Pass' }));

    await waitFor(() => {
      expect(trackMock).toHaveBeenCalledWith('paywall_upgrade_clicked', {
        surface: 'pricing_page',
        plan: 'week_pass',
      });
    });
  });

  it('tracks paywall_upgrade_clicked with plan=unlimited when Upgrade button is clicked', async () => {
    const { track } = await import('../../lib/analytics/track');
    const trackMock = vi.mocked(track);
    trackMock.mockClear();
    mockStartUnlimitedCheckout.mockResolvedValue({ url: 'https://checkout.stripe.com/unlimited' });
    Object.defineProperty(globalThis, 'location', { writable: true, value: { href: '' } });

    renderAt('/pricing', { isLoggedIn: true });
    fireEvent.click(screen.getByRole('button', { name: 'Upgrade' }));

    await waitFor(() => {
      expect(trackMock).toHaveBeenCalledWith('paywall_upgrade_clicked', {
        surface: 'pricing_page',
        plan: 'unlimited',
      });
    });
  });
});

describe('PricingPage pricing_left telemetry', () => {
  beforeEach(() => {
    mockUseCardUsage.mockReturnValue(null);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fires pricing_left with seconds_on_page when unmounted', async () => {
    const { track } = await import('../../lib/analytics/track');
    const trackMock = vi.mocked(track);
    trackMock.mockClear();

    const { unmount } = renderAt('/pricing');
    vi.advanceTimersByTime(8000);
    act(() => { unmount(); });

    expect(trackMock).toHaveBeenCalledWith('pricing_left', { seconds_on_page: 8 });
  });

  it('fires pricing_left with 0 seconds when unmounted immediately', async () => {
    const { track } = await import('../../lib/analytics/track');
    const trackMock = vi.mocked(track);
    trackMock.mockClear();

    const { unmount } = renderAt('/pricing');
    act(() => { unmount(); });

    expect(trackMock).toHaveBeenCalledWith('pricing_left', { seconds_on_page: 0 });
  });
});

describe('PricingPage quota_remaining in paywall_shown', () => {
  it('includes quota_remaining when card usage is available', async () => {
    mockUseCardUsage.mockReturnValue({ cards_used: 60, cards_limit: 100, unlimited: false, loading: false });
    const { track } = await import('../../lib/analytics/track');
    const trackMock = vi.mocked(track);
    trackMock.mockClear();

    renderAt('/pricing');

    expect(trackMock).toHaveBeenCalledWith('paywall_shown', {
      surface: 'pricing_page',
      quota_remaining: 40,
    });
  });

  it('omits quota_remaining when card usage is not loaded', async () => {
    mockUseCardUsage.mockReturnValue(null);
    const { track } = await import('../../lib/analytics/track');
    const trackMock = vi.mocked(track);
    trackMock.mockClear();

    renderAt('/pricing');

    expect(trackMock).toHaveBeenCalledWith('paywall_shown', { surface: 'pricing_page' });
  });
});

describe('PricingPage Unlimited billing toggle', () => {
  it('does not render the billing toggle when yearlyAvailable is false', () => {
    renderAt('/pricing', { unlimitedYearlyAvailable: false });
    expect(screen.queryByRole('radiogroup', { name: 'Billing cycle' })).not.toBeInTheDocument();
  });

  it('renders Monthly and Yearly options when yearlyAvailable is true', () => {
    renderAt('/pricing', { unlimitedYearlyAvailable: true });
    const group = screen.getByRole('radiogroup', { name: 'Billing cycle' });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Monthly' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Yearly' })).toBeInTheDocument();
  });

  it('shows $6 / mo by default', () => {
    renderAt('/pricing', { unlimitedYearlyAvailable: true });
    const price = screen.getByText('$6');
    expect(price).toBeInTheDocument();
    expect(price.parentElement?.textContent ?? '').toContain('/ mo');
  });

  it('shows $60 / yr and 2 months free after selecting Yearly', () => {
    renderAt('/pricing', { unlimitedYearlyAvailable: true });
    fireEvent.click(screen.getByRole('radio', { name: 'Yearly' }));
    expect(screen.getByText('$60')).toBeInTheDocument();
    expect(screen.getByText('/ yr')).toBeInTheDocument();
    expect(screen.getByText('2 months free')).toBeInTheDocument();
  });

  it('calls startUnlimitedCheckout with month when Monthly is selected', async () => {
    mockStartUnlimitedCheckout.mockResolvedValue({ url: 'https://checkout.stripe.com/month' });
    Object.defineProperty(globalThis, 'location', { writable: true, value: { href: '' } });

    renderAt('/pricing', { isLoggedIn: true, unlimitedYearlyAvailable: true });
    fireEvent.click(screen.getByRole('button', { name: 'Upgrade' }));

    await waitFor(() => {
      expect(mockStartUnlimitedCheckout).toHaveBeenCalledWith('month');
    });
  });

  it('calls startUnlimitedCheckout with year when Yearly is selected', async () => {
    mockStartUnlimitedCheckout.mockResolvedValue({ url: 'https://checkout.stripe.com/year' });
    Object.defineProperty(globalThis, 'location', { writable: true, value: { href: '' } });

    renderAt('/pricing', { isLoggedIn: true, unlimitedYearlyAvailable: true });
    fireEvent.click(screen.getByRole('radio', { name: 'Yearly' }));
    fireEvent.click(screen.getByRole('button', { name: 'Upgrade' }));

    await waitFor(() => {
      expect(mockStartUnlimitedCheckout).toHaveBeenCalledWith('year');
    });
  });

  it('redirects to login when logged-out user clicks Upgrade', () => {
    Object.defineProperty(globalThis, 'location', { writable: true, value: { href: '' } });
    renderAt('/pricing', { isLoggedIn: false, unlimitedYearlyAvailable: true });
    fireEvent.click(screen.getByRole('button', { name: 'Upgrade' }));
    expect(globalThis.location.href).toBe('/login?redirect=/pricing');
  });
});
