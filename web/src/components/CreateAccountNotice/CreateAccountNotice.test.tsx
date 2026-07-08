import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { CreateAccountNotice } from './CreateAccountNotice';

const mockTrack = vi.fn();

vi.mock('../../lib/analytics/track', () => ({
  track: (...args: unknown[]) => mockTrack(...args),
}));

describe('CreateAccountNotice', () => {
  beforeEach(() => {
    mockTrack.mockClear();
  });

  it('renders the account offer and fires account_offer_shown', () => {
    render(<CreateAccountNotice />, { wrapper: MemoryRouter });

    expect(screen.getByText('Keep your next decks')).toBeInTheDocument();
    expect(mockTrack).toHaveBeenCalledWith('account_offer_shown', {
      surface: 'upload_success_signup',
    });
  });

  it('links to registration and tracks the click', () => {
    render(<CreateAccountNotice />, { wrapper: MemoryRouter });

    const cta = screen.getByRole('link', { name: 'Create a free account' });
    expect(cta).toHaveAttribute('href', '/register?redirect=/upload');

    fireEvent.click(cta);
    expect(mockTrack).toHaveBeenCalledWith('account_offer_clicked', {
      surface: 'upload_success_signup',
    });
  });
});
