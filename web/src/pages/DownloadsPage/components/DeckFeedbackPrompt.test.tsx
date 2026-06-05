import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const submitEmojiFeedback = vi.fn();
const startPassCheckout = vi.fn();

vi.mock('../../../lib/backend/get2ankiApi', () => ({
  get2ankiApi: () => ({ submitEmojiFeedback, startPassCheckout }),
}));

const mockUseUserLocals = vi.fn();

vi.mock('../../../lib/hooks/useUserLocals', () => ({
  useUserLocals: () => mockUseUserLocals(),
}));

const mockTrack = vi.fn();

vi.mock('../../../lib/analytics/track', () => ({
  track: (...args: unknown[]) => mockTrack(...args),
}));

import {
  DeckFeedbackPrompt,
  isDeckFeedbackSuppressed,
} from './DeckFeedbackPrompt';

const SUPPRESSED_UNTIL_KEY = '2anki_deck_feedback_suppressed_until';

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

beforeEach(() => {
  submitEmojiFeedback.mockReset();
  submitEmojiFeedback.mockResolvedValue(undefined);
  startPassCheckout.mockReset();
  mockTrack.mockClear();
  mockUseUserLocals.mockReturnValue(freeUser);
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe('DeckFeedbackPrompt', () => {
  it('shows the binary prompt by default', () => {
    render(<DeckFeedbackPrompt />);
    expect(
      screen.getByText('Did this deck come out right?')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Yes, it worked' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Something was off' })
    ).toBeInTheDocument();
  });

  it('posts rating 5 with page="downloads/deck_done" when user confirms the deck worked', async () => {
    render(<DeckFeedbackPrompt />);
    fireEvent.click(screen.getByRole('button', { name: 'Yes, it worked' }));
    await waitFor(() => {
      expect(submitEmojiFeedback).toHaveBeenCalledWith(
        5,
        'downloads/deck_done',
        undefined
      );
    });
  });

  it('opens the follow-up textarea when the user reports a problem', () => {
    render(<DeckFeedbackPrompt />);
    fireEvent.click(screen.getByRole('button', { name: 'Something was off' }));
    expect(screen.getByLabelText('What went wrong?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument();
  });

  it('posts rating 1 with the comment when the user fills the follow-up and sends', async () => {
    render(<DeckFeedbackPrompt />);
    fireEvent.click(screen.getByRole('button', { name: 'Something was off' }));
    fireEvent.change(screen.getByLabelText('What went wrong?'), {
      target: { value: 'images were missing' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => {
      expect(submitEmojiFeedback).toHaveBeenCalledWith(
        1,
        'downloads/deck_done',
        'images were missing'
      );
    });
    expect(await screen.findByText('Feedback received.')).toBeInTheDocument();
  });

  it('posts rating 1 with no comment when the user skips the follow-up', async () => {
    render(<DeckFeedbackPrompt />);
    fireEvent.click(screen.getByRole('button', { name: 'Something was off' }));
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    await waitFor(() => {
      expect(submitEmojiFeedback).toHaveBeenCalledWith(
        1,
        'downloads/deck_done',
        undefined
      );
    });
    expect(await screen.findByText('Feedback received.')).toBeInTheDocument();
  });

  it('writes a 14-day suppression timestamp on dismiss', () => {
    render(<DeckFeedbackPrompt />);
    fireEvent.click(screen.getByLabelText('Dismiss'));
    expect(isDeckFeedbackSuppressed()).toBe(true);
  });

  it('writes the suppression timestamp on successful submit', async () => {
    render(<DeckFeedbackPrompt />);
    fireEvent.click(screen.getByRole('button', { name: 'Yes, it worked' }));
    await waitFor(() => {
      expect(isDeckFeedbackSuppressed()).toBe(true);
    });
  });

  it('shows a retry button when the submit fails', async () => {
    submitEmojiFeedback.mockRejectedValueOnce(new Error('network'));
    render(<DeckFeedbackPrompt />);
    fireEvent.click(screen.getByRole('button', { name: 'Yes, it worked' }));
    expect(await screen.findByText("Couldn't send that.")).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Try again' })
    ).toBeInTheDocument();
  });

  it('isDeckFeedbackSuppressed returns false when no timestamp is stored', () => {
    expect(isDeckFeedbackSuppressed()).toBe(false);
  });

  it('isDeckFeedbackSuppressed returns false when timestamp is in the past', () => {
    localStorage.setItem(SUPPRESSED_UNTIL_KEY, String(Date.now() - 1000));
    expect(isDeckFeedbackSuppressed()).toBe(false);
  });

  it('isDeckFeedbackSuppressed returns true when timestamp is in the future', () => {
    localStorage.setItem(SUPPRESSED_UNTIL_KEY, String(Date.now() + 1000));
    expect(isDeckFeedbackSuppressed()).toBe(true);
  });
});

describe('DeckFeedbackPrompt — Day Pass offer after positive rating', () => {
  it('shows the Day Pass offer to a free user after they confirm the deck worked', async () => {
    render(<DeckFeedbackPrompt />);
    fireEvent.click(screen.getByRole('button', { name: 'Yes, it worked' }));
    expect(await screen.findByText('Deck came out right.')).toBeInTheDocument();
    expect(
      screen.getByText('Keep going without the monthly limit — Day Pass, $4.')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Get Day Pass' })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'See all plans' })).toHaveAttribute(
      'href',
      '/pricing?source=deck_feedback'
    );
  });

  it('does not show the Day Pass offer to paying users', async () => {
    mockUseUserLocals.mockReturnValue(payingUser);
    render(<DeckFeedbackPrompt />);
    fireEvent.click(screen.getByRole('button', { name: 'Yes, it worked' }));
    expect(await screen.findByText('Feedback received.')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Get Day Pass' })
    ).not.toBeInTheDocument();
  });

  it('does not show the offer after a negative rating', async () => {
    render(<DeckFeedbackPrompt />);
    fireEvent.click(screen.getByRole('button', { name: 'Something was off' }));
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    expect(await screen.findByText('Feedback received.')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Get Day Pass' })
    ).not.toBeInTheDocument();
  });

  it('fires paywall_shown with surface=deck_feedback_sent when the offer renders', async () => {
    render(<DeckFeedbackPrompt />);
    fireEvent.click(screen.getByRole('button', { name: 'Yes, it worked' }));
    await waitFor(() => {
      expect(mockTrack).toHaveBeenCalledWith('paywall_shown', {
        surface: 'deck_feedback_sent',
      });
    });
  });

  it('fires paywall_upgrade_clicked with plan=day_pass and redirects on Day Pass click', async () => {
    startPassCheckout.mockResolvedValue({
      url: 'https://checkout.stripe.com/day',
    });
    Object.defineProperty(globalThis, 'location', {
      writable: true,
      value: { href: '' },
    });
    render(<DeckFeedbackPrompt />);
    fireEvent.click(screen.getByRole('button', { name: 'Yes, it worked' }));
    const cta = await screen.findByRole('button', { name: 'Get Day Pass' });
    fireEvent.click(cta);
    await waitFor(() => {
      expect(mockTrack).toHaveBeenCalledWith('paywall_upgrade_clicked', {
        surface: 'deck_feedback_sent',
        plan: 'day_pass',
      });
      expect(startPassCheckout).toHaveBeenCalledWith(
        '24h',
        undefined,
        'deck_feedback_sent'
      );
    });
  });

  it('shows Redirecting label and disables the button while Day Pass checkout is pending', async () => {
    let resolveCheckout: (value: { status: 'error' }) => void = () => {};
    startPassCheckout.mockReturnValue(
      new Promise((resolve) => {
        resolveCheckout = resolve;
      })
    );
    render(<DeckFeedbackPrompt />);
    fireEvent.click(screen.getByRole('button', { name: 'Yes, it worked' }));
    const cta = await screen.findByRole('button', { name: 'Get Day Pass' });
    fireEvent.click(cta);
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Redirecting…' })
      ).toBeDisabled();
    });
    resolveCheckout({ status: 'error' });
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Get Day Pass' })
      ).toBeInTheDocument();
    });
  });
});
