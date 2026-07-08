import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { PassLadderCard } from './PassLadderCard';

const mockUseUserLocals = vi.fn();

vi.mock('../../lib/hooks/useUserLocals', () => ({
  useUserLocals: () => mockUseUserLocals(),
}));

const mockTrack = vi.fn();

vi.mock('../../lib/analytics/track', () => ({
  track: (...args: unknown[]) => mockTrack(...args),
}));

const repeatBuyer = {
  data: {
    locals: { patreon: false, subscriber: true },
    user: { email: 'buyer@example.com' },
    passLadder: { passCount: 3, spentUsd: 13 },
  },
};

const singleBuyer = {
  data: {
    locals: { patreon: false, subscriber: true },
    user: { email: 'buyer@example.com' },
    passLadder: null,
  },
};

describe('PassLadderCard', () => {
  beforeEach(() => {
    mockTrack.mockClear();
    mockUseUserLocals.mockReset();
  });

  it('shows the pass math for a repeat buyer and fires paywall_shown', () => {
    mockUseUserLocals.mockReturnValue(repeatBuyer);
    render(<PassLadderCard />);

    expect(
      screen.getByText('Spending more on passes than Unlimited costs?')
    ).toBeInTheDocument();
    expect(
      screen.getByText(/You've bought 3 passes — \$13\./)
    ).toBeInTheDocument();
    expect(mockTrack).toHaveBeenCalledWith('paywall_shown', {
      surface: 'pass_ladder_success',
      passes: 3,
      spent_usd: 13,
    });
  });

  it('links to the subscribe flow and tracks the upgrade click', () => {
    mockUseUserLocals.mockReturnValue(repeatBuyer);
    render(<PassLadderCard />);

    const cta = screen.getByRole('link', { name: 'Get Unlimited — $7.99/mo' });
    expect(cta).toHaveAttribute(
      'href',
      expect.stringContaining('prefilled_email=buyer%40example.com')
    );

    fireEvent.click(cta);
    expect(mockTrack).toHaveBeenCalledWith('paywall_upgrade_clicked', {
      surface: 'pass_ladder_success',
      plan: 'unlimited',
    });
  });

  it('renders nothing when the server sends no offer', () => {
    mockUseUserLocals.mockReturnValue(singleBuyer);
    const { container } = render(<PassLadderCard />);

    expect(container).toBeEmptyDOMElement();
    expect(mockTrack).not.toHaveBeenCalled();
  });

  it('renders nothing while locals are loading', () => {
    mockUseUserLocals.mockReturnValue({ data: undefined });
    const { container } = render(<PassLadderCard />);

    expect(container).toBeEmptyDOMElement();
  });
});
