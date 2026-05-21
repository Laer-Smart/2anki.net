import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { PaywallBanner } from './PaywallBanner';
import JobResponse from '../../../schemas/public/JobResponse';

vi.mock('../../../lib/analytics/track', () => ({
  track: vi.fn(),
}));

type AnalyticsGlobals = {
  hj?: ReturnType<typeof vi.fn>;
  gtag?: ReturnType<typeof vi.fn>;
};

function buildJob(overrides: Partial<JobResponse> = {}): JobResponse {
  return {
    id: 1 as JobResponse['id'],
    owner: 'owner-1',
    object_id: 'page-id',
    status: 'started',
    created_at: new Date('2026-05-10T11:30:00Z'),
    last_edited_time: new Date('2026-05-10T11:30:00Z'),
    title: 'Biology Chapter 1',
    type: 'page',
    job_reason_failure: null,
    restartable: false,
    download_key: null,
    upload_id: null,
    ...overrides,
  };
}

describe('PaywallBanner', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-10T12:00:00Z'));
    (globalThis as AnalyticsGlobals).hj = vi.fn();
    (globalThis as AnalyticsGlobals).gtag = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    delete (globalThis as AnalyticsGlobals).hj;
    delete (globalThis as AnalyticsGlobals).gtag;
  });

  it('renders headline body and CTA pointing to /pricing?source=paywall-cancel', () => {
    render(
      <MemoryRouter>
        <PaywallBanner inProgressJob={null} />
      </MemoryRouter>
    );

    expect(
      screen.getByText('One conversion at a time on the free plan')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'This conversion was paused so the one you already started can finish. Upgrade to Unlimited to run several at once.'
      )
    ).toBeInTheDocument();
    const cta = screen.getByRole('link', {
      name: /Upgrade to Unlimited — \$6 \/ mo/,
    });
    expect(cta).toHaveAttribute('href', '/pricing?source=paywall-cancel');
  });

  it('shows in-progress job title and relative start time when inProgressJob is provided', () => {
    render(
      <MemoryRouter>
        <PaywallBanner inProgressJob={buildJob({ title: 'Biology Chapter 1' })} />
      </MemoryRouter>
    );

    expect(screen.getByText('Biology Chapter 1')).toBeInTheDocument();
    expect(screen.getByText(/started 30 minutes ago/)).toBeInTheDocument();
  });

  it('falls back to generic copy when in-progress job title is missing', () => {
    render(
      <MemoryRouter>
        <PaywallBanner inProgressJob={buildJob({ title: null })} />
      </MemoryRouter>
    );

    expect(
      screen.getByText(/Or wait for your current conversion to finish/)
    ).toBeInTheDocument();
  });

  it('fires paywall_shown on mount and paywall_clicked_upgrade before navigation', () => {
    const hj = (globalThis as AnalyticsGlobals).hj!;
    const gtag = (globalThis as AnalyticsGlobals).gtag!;

    render(
      <MemoryRouter>
        <PaywallBanner inProgressJob={null} />
      </MemoryRouter>
    );

    expect(hj).toHaveBeenCalledWith('event', 'paywall_shown');
    expect(gtag).toHaveBeenCalledWith('event', 'paywall_shown');

    hj.mockClear();
    gtag.mockClear();

    const cta = screen.getByRole('link', {
      name: /Upgrade to Unlimited — \$6 \/ mo/,
    });
    fireEvent.click(cta);

    expect(hj).toHaveBeenCalledWith('event', 'paywall_clicked_upgrade');
    expect(gtag).toHaveBeenCalledWith('event', 'paywall_clicked_upgrade');
  });

  it('tracks paywall_shown with surface=downloads_banner on mount', async () => {
    const { track } = await import('../../../lib/analytics/track');
    const trackMock = vi.mocked(track);
    trackMock.mockClear();

    render(
      <MemoryRouter>
        <PaywallBanner inProgressJob={null} />
      </MemoryRouter>
    );

    expect(trackMock).toHaveBeenCalledWith('paywall_shown', { surface: 'downloads_banner' });
  });

  it('tracks paywall_upgrade_clicked with surface=downloads_banner when CTA is clicked', async () => {
    const { track } = await import('../../../lib/analytics/track');
    const trackMock = vi.mocked(track);
    trackMock.mockClear();

    render(
      <MemoryRouter>
        <PaywallBanner inProgressJob={null} />
      </MemoryRouter>
    );

    const cta = screen.getByRole('link', {
      name: /Upgrade to Unlimited — \$6 \/ mo/,
    });
    fireEvent.click(cta);

    expect(trackMock).toHaveBeenCalledWith('paywall_upgrade_clicked', { surface: 'downloads_banner' });
  });
});
