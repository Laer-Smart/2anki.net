import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import CancelFunnelChart from './CancelFunnelChart';
import { CancelFunnelResponse } from '../cancelFunnelTypes';

const buildData = (
  overrides?: Partial<CancelFunnelResponse>
): CancelFunnelResponse => ({
  stages: {
    cancel_started: 100,
    pause_offered: 40,
    paused: 12,
    cancelled: 70,
    pause_offer_declined: 25,
  },
  save_rate_pct: 30,
  offer_reach_pct: 40,
  since: '2026-06-18T00:00:00.000Z',
  as_of: '2026-07-18T00:00:00.000Z',
  ...overrides,
});

describe('CancelFunnelChart', () => {
  it('renders the saved headline with the named denominator and rate', () => {
    render(<CancelFunnelChart data={buildData()} />);

    const headline = screen.getByText('saved').closest('p');
    expect(headline).toHaveTextContent('saved 12 of 40 offered — 30%');
  });

  it('shows offer-reach as the share of cancels that saw the offer', () => {
    render(<CancelFunnelChart data={buildData()} />);

    expect(
      screen.getByText('40% of cancels saw the pause offer')
    ).toBeInTheDocument();
  });

  it('renders each stage count', () => {
    render(<CancelFunnelChart data={buildData()} />);

    expect(screen.getByText('cancel started')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('pause offer declined')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
  });

  it('rounds fractional rates to one decimal place', () => {
    render(
      <CancelFunnelChart
        data={buildData({ save_rate_pct: 33.333, offer_reach_pct: 12.345 })}
      />
    );

    expect(screen.getByText('of 40 offered — 33.3%')).toBeInTheDocument();
    expect(
      screen.getByText('12.3% of cancels saw the pause offer')
    ).toBeInTheDocument();
  });

  it('shows an empty message when there are no stages', () => {
    render(<CancelFunnelChart data={{ ...buildData(), stages: null }} />);

    expect(
      screen.getByText('No cancellations recorded yet.')
    ).toBeInTheDocument();
  });
});
