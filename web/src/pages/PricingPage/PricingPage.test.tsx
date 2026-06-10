import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import PricingPage from './PricingPage';

const mockStartAutoSyncCheckout = vi.fn();
const mockRequestHostedAnkiAccess = vi.fn();
const mockStartPassCheckout = vi.fn();
const mockStartUnlimitedCheckout = vi.fn();
const mockGetCheckoutPrices = vi.fn();

vi.mock('../../lib/backend/get2ankiApi', () => ({
  get2ankiApi: () => ({
    requestHostedAnkiAccess: mockRequestHostedAnkiAccess,
    startAutoSyncCheckout: mockStartAutoSyncCheckout,
    startPassCheckout: mockStartPassCheckout,
    startUnlimitedCheckout: mockStartUnlimitedCheckout,
    getCheckoutPrices: mockGetCheckoutPrices,
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

const { mockPricingVariant } = vi.hoisted(() => ({
  mockPricingVariant: {
    current: 'minimal' as 'minimal' | 'unlimited-first' | 'minimal',
  },
}));

vi.mock('../../lib/hooks/usePricingOrderVariant', () => ({
  usePricingOrderVariant: () => mockPricingVariant.current,
}));

beforeEach(() => {
  mockPricingVariant.current = 'minimal';
  mockGetCheckoutPrices.mockResolvedValue(null);
});

type AnalyticsGlobals = {
  hj?: ReturnType<typeof vi.fn>;
  gtag?: ReturnType<typeof vi.fn>;
};

const renderAt = (
  path: string,
  props: Partial<Parameters<typeof PricingPage>[0]> = {}
) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <PricingPage isLoggedIn={false} {...props} />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('PricingPage Unlimited benefits', () => {
  it('lists parallel conversions as a benefit', () => {
    renderAt('/pricing');
    expect(
      screen.getAllByText('Run multiple conversions at once').length
    ).toBeGreaterThan(0);
  });

  it('features the Day Pass with the Most popular badge', () => {
    renderAt('/pricing');
    expect(screen.getByText('Most popular')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Get Day Pass' })
    ).toBeInTheDocument();
  });
});

describe('PricingPage layout', () => {
  it('renders Unlimited and Auto Sync cards', () => {
    renderAt('/pricing');
    expect(screen.getAllByText('Unlimited').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Auto Sync').length).toBeGreaterThan(0);
  });

  it('does not show the auto-sync upsell context banner', () => {
    renderAt('/pricing?upsell=auto-sync', { isLoggedIn: true });
    expect(
      screen.queryByText(
        'Auto Sync sends any deck straight to your Anki — no downloading, no importing.'
      )
    ).not.toBeInTheDocument();
  });

  it('shows Lifetime card with From $345 price', () => {
    renderAt('/pricing');
    expect(screen.getAllByText('From $345').length).toBeGreaterThan(0);
  });

  it('shows the legacy Unlimited price in the comparison table by default', async () => {
    renderAt('/pricing');
    expect(await screen.findByText('$6 / mo')).toBeInTheDocument();
  });

  it('shows the fetched v2 Unlimited price in the comparison table', async () => {
    mockGetCheckoutPrices.mockResolvedValue({
      monthly: { cents: 799 },
      annual: { cents: 6400 },
      legacy: false,
      lockInDeadline: null,
    });
    renderAt('/pricing');
    expect(await screen.findByText('$7.99 / mo')).toBeInTheDocument();
    expect(screen.queryByText('$6 / mo')).not.toBeInTheDocument();
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

  it('leads with the pay-once passes above the monthly plans', () => {
    renderAt('/pricing');
    const passLabel = screen.getByText('Pay once — no subscription');
    const monthlyLabel = screen.getByText('Monthly plans');
    expect(
      passLabel.compareDocumentPosition(monthlyLabel) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('leads with the monthly plans when the variant is unlimited-first', () => {
    mockPricingVariant.current = 'unlimited-first';
    renderAt('/pricing');
    const monthlyLabel = screen.getByText('Monthly plans');
    const passLabel = screen.getByText('Pay once — no subscription');
    expect(
      monthlyLabel.compareDocumentPosition(passLabel) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(screen.getByText('Most popular')).toBeInTheDocument();
  });

  it('drops the kicker, intro, and social proof in the minimal variant', () => {
    mockPricingVariant.current = 'minimal';
    renderAt('/pricing');
    expect(screen.queryByText('Plans')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Trusted by 19,000+ learners worldwide')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/no account needed to start/)
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Get Day Pass' })
    ).toBeInTheDocument();
  });

  it('shows the risk-reversal reassurance strip', () => {
    renderAt('/pricing');
    expect(screen.getByText('Cancel anytime — one click')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Your decks are yours — native .apkg, works in any Anki client'
      )
    ).toBeInTheDocument();
  });

  it('shows Day Pass and Week Pass as full cards with visible buttons', () => {
    renderAt('/pricing');
    expect(
      screen.getByRole('button', { name: 'Get Day Pass' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Get Week Pass' })
    ).toBeInTheDocument();
  });

  it('shows philosophy line', () => {
    renderAt('/pricing');
    expect(
      screen.getByText('Free works forever. Paid plans support 2anki.net.')
    ).toBeInTheDocument();
  });

  it('renders the feature overview grid', () => {
    renderAt('/pricing');
    expect(
      screen.getByRole('heading', { name: 'Everything 2anki does' })
    ).toBeInTheDocument();
  });

  it('renders the plan comparison table', () => {
    renderAt('/pricing');
    expect(
      screen.getByRole('heading', { name: 'Compare every plan' })
    ).toBeInTheDocument();
  });

  it('renders the FAQ section with visible questions', () => {
    renderAt('/pricing');
    expect(
      screen.getByRole('heading', { name: 'Questions & answers' })
    ).toBeInTheDocument();
    expect(screen.getByText('What is Auto Sync?')).toBeInTheDocument();
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
    expect(
      screen.getByRole('button', { name: 'Get Auto Sync' })
    ).toBeInTheDocument();
  });

  it('does not feature Auto Sync with the New — built for Notion badge', () => {
    renderAt('/pricing');
    expect(
      screen.queryByText('New — built for Notion')
    ).not.toBeInTheDocument();
  });

  it('redirects to login when logged-out user clicks Subscribe', () => {
    const originalHref = globalThis.location.href;
    Object.defineProperty(globalThis, 'location', {
      writable: true,
      value: { href: '' },
    });

    renderAt('/pricing', { isLoggedIn: false });
    fireEvent.click(screen.getByRole('button', { name: 'Get Auto Sync' }));
    expect(globalThis.location.href).toBe('/login?redirect=/pricing');

    Object.defineProperty(globalThis, 'location', {
      writable: true,
      value: { href: originalHref },
    });
  });

  it('shows waitlist caption for waitlisted user', () => {
    renderAt('/pricing', { isLoggedIn: true, hostedAnkiRequested: true });
    expect(
      screen.getByText('Waitlist is open — subscribe anytime.')
    ).toBeInTheDocument();
  });

  it('shows Included in Lifetime plan caption for patreon user and hides price', () => {
    renderAt('/pricing', { isLoggedIn: true, patreon: true });
    expect(
      screen.getByText('Included in your Lifetime plan')
    ).toBeInTheDocument();
  });

  it('shows Join the waitlist when cap is reached', () => {
    renderAt('/pricing', { isLoggedIn: true, autoSyncCapReached: true });
    expect(
      screen.getByRole('button', { name: 'Join the waitlist' })
    ).toBeInTheDocument();
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
    fireEvent.click(screen.getByRole('button', { name: 'Get Auto Sync' }));

    await waitFor(() => {
      expect(
        screen.getByText(
          "Couldn't start checkout. Try again, or email support@2anki.net."
        )
      ).toBeInTheDocument();
    });
    expect(globalThis.location.href).toBe(originalHref);
  });

  it('redirects to /ankify/setup when the user is already subscribed', async () => {
    mockStartAutoSyncCheckout.mockResolvedValue({
      status: 'already_subscribed',
    });
    Object.defineProperty(globalThis, 'location', {
      writable: true,
      value: { href: '' },
    });

    renderAt('/pricing', { isLoggedIn: true });
    fireEvent.click(screen.getByRole('button', { name: 'Get Auto Sync' }));

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
    mockStartAutoSyncCheckout.mockResolvedValue({
      url: 'https://checkout.stripe.com/session',
    });
    Object.defineProperty(globalThis, 'location', {
      writable: true,
      value: { href: '' },
    });

    renderAt('/pricing', { isLoggedIn: true });
    fireEvent.click(screen.getByRole('button', { name: 'Get Auto Sync' }));

    await waitFor(() => {
      expect(mockStartAutoSyncCheckout).toHaveBeenCalled();
      expect(globalThis.location.href).toBe(
        'https://checkout.stripe.com/session'
      );
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
    expect(
      screen.queryByText(/anki desktop in your browser/i)
    ).not.toBeInTheDocument();
  });

  it('shows the accurate Anki → Notion note caps (1,000 free / 5,000 paid)', () => {
    renderAt('/pricing');
    expect(
      screen.getByRole('row', { name: /Anki → Notion notes/ })
    ).toBeInTheDocument();
    expect(screen.getAllByText('1,000').length).toBeGreaterThan(0);
    expect(screen.getAllByText('5,000').length).toBeGreaterThan(0);
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

    expect(trackMock).toHaveBeenCalledWith('paywall_shown', {
      surface: 'pricing_page',
      variant: 'minimal',
    });
  });

  it('tracks paywall_upgrade_clicked with plan=auto_sync when Subscribe is clicked', async () => {
    const { track } = await import('../../lib/analytics/track');
    const trackMock = vi.mocked(track);
    trackMock.mockClear();
    mockStartAutoSyncCheckout.mockResolvedValue({
      url: 'https://checkout.stripe.com/session',
    });
    Object.defineProperty(globalThis, 'location', {
      writable: true,
      value: { href: '' },
    });

    renderAt('/pricing', { isLoggedIn: true });
    fireEvent.click(screen.getByRole('button', { name: 'Get Auto Sync' }));

    await waitFor(() => {
      expect(trackMock).toHaveBeenCalledWith('paywall_upgrade_clicked', {
        surface: 'pricing_page',
        plan: 'auto_sync',
        variant: 'minimal',
      });
    });
  });

  it('tracks paywall_upgrade_clicked with plan=day_pass when Day Pass is clicked', async () => {
    const { track } = await import('../../lib/analytics/track');
    const trackMock = vi.mocked(track);
    trackMock.mockClear();
    mockStartPassCheckout.mockResolvedValue({
      url: 'https://checkout.stripe.com/day',
    });
    Object.defineProperty(globalThis, 'location', {
      writable: true,
      value: { href: '' },
    });

    renderAt('/pricing', { isLoggedIn: true });
    fireEvent.click(screen.getByRole('button', { name: 'Get Day Pass' }));

    await waitFor(() => {
      expect(trackMock).toHaveBeenCalledWith('paywall_upgrade_clicked', {
        surface: 'pricing_page',
        plan: 'day_pass',
        variant: 'minimal',
      });
    });
  });

  it('tracks paywall_upgrade_clicked with plan=week_pass when Week Pass is clicked', async () => {
    const { track } = await import('../../lib/analytics/track');
    const trackMock = vi.mocked(track);
    trackMock.mockClear();
    mockStartPassCheckout.mockResolvedValue({
      url: 'https://checkout.stripe.com/week',
    });
    Object.defineProperty(globalThis, 'location', {
      writable: true,
      value: { href: '' },
    });

    renderAt('/pricing', { isLoggedIn: true });
    fireEvent.click(screen.getByRole('button', { name: 'Get Week Pass' }));

    await waitFor(() => {
      expect(trackMock).toHaveBeenCalledWith('paywall_upgrade_clicked', {
        surface: 'pricing_page',
        plan: 'week_pass',
        variant: 'minimal',
      });
    });
  });

  it('tracks paywall_upgrade_clicked with plan=unlimited when Upgrade button is clicked', async () => {
    const { track } = await import('../../lib/analytics/track');
    const trackMock = vi.mocked(track);
    trackMock.mockClear();
    mockStartUnlimitedCheckout.mockResolvedValue({
      url: 'https://checkout.stripe.com/unlimited',
    });
    Object.defineProperty(globalThis, 'location', {
      writable: true,
      value: { href: '' },
    });

    renderAt('/pricing', { isLoggedIn: true });
    fireEvent.click(screen.getByRole('button', { name: 'Get Unlimited' }));

    await waitFor(() => {
      expect(trackMock).toHaveBeenCalledWith('paywall_upgrade_clicked', {
        surface: 'pricing_page',
        plan: 'unlimited',
        variant: 'minimal',
      });
    });
  });

  it('fires paywall_upgrade_clicked exactly once for a logged-in Auto Sync click', async () => {
    const { track } = await import('../../lib/analytics/track');
    const trackMock = vi.mocked(track);
    trackMock.mockClear();
    mockStartAutoSyncCheckout.mockResolvedValue({
      url: 'https://checkout.stripe.com/session',
    });
    Object.defineProperty(globalThis, 'location', {
      writable: true,
      value: { href: '' },
    });

    renderAt('/pricing', { isLoggedIn: true });
    fireEvent.click(screen.getByRole('button', { name: 'Get Auto Sync' }));

    await waitFor(() => {
      expect(globalThis.location.href).toBe(
        'https://checkout.stripe.com/session'
      );
    });
    expect(
      trackMock.mock.calls.filter(
        ([event]) => event === 'paywall_upgrade_clicked'
      )
    ).toHaveLength(1);
  });
});

describe('PricingPage anonymous upgrade-click tracking', () => {
  beforeEach(() => {
    mockUseCardUsage.mockReturnValue(null);
  });

  it('tracks paywall_upgrade_clicked then redirects to login for an anonymous Auto Sync click', async () => {
    const { track } = await import('../../lib/analytics/track');
    const trackMock = vi.mocked(track);
    trackMock.mockClear();
    mockStartAutoSyncCheckout.mockClear();
    Object.defineProperty(globalThis, 'location', {
      writable: true,
      value: { href: '' },
    });

    renderAt('/pricing', { isLoggedIn: false });
    fireEvent.click(screen.getByRole('button', { name: 'Get Auto Sync' }));

    expect(trackMock).toHaveBeenCalledWith('paywall_upgrade_clicked', {
      surface: 'pricing_page',
      plan: 'auto_sync',
      variant: 'minimal',
    });
    expect(globalThis.location.href).toBe('/login?redirect=/pricing');
    expect(mockStartAutoSyncCheckout).not.toHaveBeenCalled();
  });

  it('tracks paywall_upgrade_clicked then redirects to login for an anonymous Day Pass click', async () => {
    const { track } = await import('../../lib/analytics/track');
    const trackMock = vi.mocked(track);
    trackMock.mockClear();
    mockStartPassCheckout.mockClear();
    Object.defineProperty(globalThis, 'location', {
      writable: true,
      value: { href: '' },
    });

    renderAt('/pricing', { isLoggedIn: false });
    fireEvent.click(screen.getByRole('button', { name: 'Get Day Pass' }));

    expect(trackMock).toHaveBeenCalledWith('paywall_upgrade_clicked', {
      surface: 'pricing_page',
      plan: 'day_pass',
      variant: 'minimal',
    });
    expect(globalThis.location.href).toBe('/login?redirect=/pricing');
    expect(mockStartPassCheckout).not.toHaveBeenCalled();
  });

  it('tracks paywall_upgrade_clicked then redirects to login for an anonymous Week Pass click', async () => {
    const { track } = await import('../../lib/analytics/track');
    const trackMock = vi.mocked(track);
    trackMock.mockClear();
    mockStartPassCheckout.mockClear();
    Object.defineProperty(globalThis, 'location', {
      writable: true,
      value: { href: '' },
    });

    renderAt('/pricing', { isLoggedIn: false });
    fireEvent.click(screen.getByRole('button', { name: 'Get Week Pass' }));

    expect(trackMock).toHaveBeenCalledWith('paywall_upgrade_clicked', {
      surface: 'pricing_page',
      plan: 'week_pass',
      variant: 'minimal',
    });
    expect(globalThis.location.href).toBe('/login?redirect=/pricing');
    expect(mockStartPassCheckout).not.toHaveBeenCalled();
  });

  it('tracks paywall_upgrade_clicked then redirects to login for an anonymous Unlimited click', async () => {
    const { track } = await import('../../lib/analytics/track');
    const trackMock = vi.mocked(track);
    trackMock.mockClear();
    mockStartUnlimitedCheckout.mockClear();
    Object.defineProperty(globalThis, 'location', {
      writable: true,
      value: { href: '' },
    });

    renderAt('/pricing', { isLoggedIn: false });
    fireEvent.click(screen.getByRole('button', { name: 'Get Unlimited' }));

    expect(trackMock).toHaveBeenCalledWith('paywall_upgrade_clicked', {
      surface: 'pricing_page',
      plan: 'unlimited',
      variant: 'minimal',
    });
    expect(globalThis.location.href).toBe('/login?redirect=/pricing');
    expect(mockStartUnlimitedCheckout).not.toHaveBeenCalled();
  });

  it('fires paywall_upgrade_clicked exactly once for an anonymous Auto Sync click', async () => {
    const { track } = await import('../../lib/analytics/track');
    const trackMock = vi.mocked(track);
    trackMock.mockClear();
    Object.defineProperty(globalThis, 'location', {
      writable: true,
      value: { href: '' },
    });

    renderAt('/pricing', { isLoggedIn: false });
    fireEvent.click(screen.getByRole('button', { name: 'Get Auto Sync' }));

    expect(
      trackMock.mock.calls.filter(
        ([event]) => event === 'paywall_upgrade_clicked'
      )
    ).toHaveLength(1);
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
    act(() => {
      unmount();
    });

    expect(trackMock).toHaveBeenCalledWith('pricing_left', {
      seconds_on_page: 8,
    });
  });

  it('fires pricing_left with 0 seconds when unmounted immediately', async () => {
    const { track } = await import('../../lib/analytics/track');
    const trackMock = vi.mocked(track);
    trackMock.mockClear();

    const { unmount } = renderAt('/pricing');
    act(() => {
      unmount();
    });

    expect(trackMock).toHaveBeenCalledWith('pricing_left', {
      seconds_on_page: 0,
    });
  });
});

describe('PricingPage quota_remaining in paywall_shown', () => {
  it('includes quota_remaining when card usage is available', async () => {
    mockUseCardUsage.mockReturnValue({
      cards_used: 60,
      cards_limit: 100,
      unlimited: false,
      loading: false,
    });
    const { track } = await import('../../lib/analytics/track');
    const trackMock = vi.mocked(track);
    trackMock.mockClear();

    renderAt('/pricing');

    expect(trackMock).toHaveBeenCalledWith('paywall_shown', {
      surface: 'pricing_page',
      quota_remaining: 40,
      variant: 'minimal',
    });
  });

  it('omits quota_remaining when card usage is not loaded', async () => {
    mockUseCardUsage.mockReturnValue(null);
    const { track } = await import('../../lib/analytics/track');
    const trackMock = vi.mocked(track);
    trackMock.mockClear();

    renderAt('/pricing');

    expect(trackMock).toHaveBeenCalledWith('paywall_shown', {
      surface: 'pricing_page',
      variant: 'minimal',
    });
  });
});

describe('PricingPage Unlimited billing toggle', () => {
  it('renders the billing toggle with both options by default', () => {
    renderAt('/pricing');
    const group = screen.getByRole('radiogroup', { name: 'Billing cycle' });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Monthly' })).toBeInTheDocument();
    expect(
      screen.getByRole('radio', { name: 'Yearly · save 17%' })
    ).toBeInTheDocument();
  });

  it('selects Yearly by default with the annual per-month hero price', () => {
    renderAt('/pricing');
    expect(
      screen.getByRole('radio', { name: 'Yearly · save 17%' })
    ).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('$5.00')).toBeInTheDocument();
    expect(
      screen.getByText('$60/year billed yearly · save 17%')
    ).toBeInTheDocument();
  });

  it('switches the hero to the monthly price and terms after selecting Monthly', () => {
    renderAt('/pricing');
    fireEvent.click(screen.getByRole('radio', { name: 'Monthly' }));
    expect(screen.getByText('$6')).toBeInTheDocument();
    expect(screen.getByText('billed monthly')).toBeInTheDocument();
    expect(
      screen.getByText('$6/month, renews monthly. Cancel anytime.')
    ).toBeInTheDocument();
  });

  it('calls startUnlimitedCheckout with month when Monthly is selected', async () => {
    mockStartUnlimitedCheckout.mockResolvedValue({
      url: 'https://checkout.stripe.com/month',
    });
    Object.defineProperty(globalThis, 'location', {
      writable: true,
      value: { href: '' },
    });

    renderAt('/pricing', { isLoggedIn: true });
    fireEvent.click(screen.getByRole('radio', { name: 'Monthly' }));
    fireEvent.click(screen.getByRole('button', { name: 'Get Unlimited' }));

    await waitFor(() => {
      expect(mockStartUnlimitedCheckout).toHaveBeenCalledWith(
        'month',
        'minimal',
        'pricing_page'
      );
    });
  });

  it('calls startUnlimitedCheckout with year by default', async () => {
    mockStartUnlimitedCheckout.mockResolvedValue({
      url: 'https://checkout.stripe.com/year',
    });
    Object.defineProperty(globalThis, 'location', {
      writable: true,
      value: { href: '' },
    });

    renderAt('/pricing', { isLoggedIn: true });
    fireEvent.click(screen.getByRole('button', { name: 'Get Unlimited' }));

    await waitFor(() => {
      expect(mockStartUnlimitedCheckout).toHaveBeenCalledWith(
        'year',
        'minimal',
        'pricing_page'
      );
    });
  });

  it('redirects to login when logged-out user clicks Upgrade', () => {
    Object.defineProperty(globalThis, 'location', {
      writable: true,
      value: { href: '' },
    });
    renderAt('/pricing', { isLoggedIn: false });
    fireEvent.click(screen.getByRole('button', { name: 'Get Unlimited' }));
    expect(globalThis.location.href).toBe('/login?redirect=/pricing');
  });
});
