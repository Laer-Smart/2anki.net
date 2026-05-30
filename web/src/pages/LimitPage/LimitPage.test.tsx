import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { LimitPage } from './LimitPage';

vi.mock('../../lib/analytics/track', () => ({
  track: vi.fn(),
}));

vi.mock('../../lib/backend/get2ankiApi', () => ({
  get2ankiApi: vi.fn(() => ({
    startAutoSyncCheckout: vi.fn().mockResolvedValue({ url: 'https://checkout.stripe.com/test' }),
  })),
}));

vi.mock('../../lib/hooks/useUserLocals', () => ({
  useUserLocals: vi.fn(() => ({
    data: {
      user: { id: 1, email: 'test@example.com' },
    },
    isLoading: false,
  })),
}));

function renderPage(initialEntries: string[] = ['/limit']) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={initialEntries}>
          <LimitPage />
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

describe('LimitPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the monthly limit message', () => {
    renderPage();
    expect(screen.getByText('You reached 100 cards this month')).toBeTruthy();
  });

  it('shows Unlimited and Auto Sync plan titles', () => {
    renderPage();
    expect(screen.getByText('Unlimited')).toBeTruthy();
    expect(screen.getByText('Auto Sync')).toBeTruthy();
  });

  it('shows the correct prices', () => {
    renderPage();
    expect(screen.getByText('$6')).toBeTruthy();
    expect(screen.getByText('$30')).toBeTruthy();
  });

  it('shows a back link to /upload', () => {
    renderPage();
    const backLink = screen.getByText('Back to upload');
    expect(backLink.closest('a')?.getAttribute('href')).toBe('/upload');
  });

  it('Unlimited plan link carries ref=limit-wall parameter', () => {
    renderPage();
    const upgradeLink = screen.getByText('Upgrade to Unlimited');
    const href = upgradeLink.getAttribute('href') ?? '';
    expect(href).toContain('ref=limit-wall');
  });

  it('Get Auto Sync button is present and clickable', () => {
    renderPage();
    const button = screen.getByText('Get Auto Sync');
    expect(button).toBeTruthy();
    fireEvent.click(button);
    expect(screen.getByText('Starting checkout…')).toBeTruthy();
  });
});

describe('LimitPage — anonymous variant', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the sign-up heading for kind=anonymous', () => {
    renderPage(['/limit?kind=anonymous']);
    expect(screen.getByText('Sign up free to keep converting')).toBeTruthy();
  });

  it('shows a "Sign up free" CTA pointing at /register', () => {
    renderPage(['/limit?kind=anonymous']);
    const cta = screen.getByText('Sign up free');
    expect(cta.closest('a')?.getAttribute('href')).toBe('/register?redirect=/upload');
  });

  it('keeps a secondary Sign in link', () => {
    renderPage(['/limit?kind=anonymous']);
    const signIn = screen.getByText('Sign in');
    expect(signIn.closest('a')?.getAttribute('href')).toBe('/login?redirect=/upload');
  });

  it('does not show the monthly-limit upgrade UI for anonymous users', () => {
    renderPage(['/limit?kind=anonymous']);
    expect(screen.queryByText('You reached 100 cards this month')).toBeNull();
    expect(screen.queryByText('Get Auto Sync')).toBeNull();
  });
});
