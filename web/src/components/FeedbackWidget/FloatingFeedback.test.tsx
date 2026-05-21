import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

vi.mock('./FeedbackWidget', () => ({
  FeedbackWidget: () => <div data-testid="feedback-widget" />,
}));

import { FloatingFeedback } from './FloatingFeedback';

const SUPPRESSED_UNTIL_KEY = '2anki_feedback_suppressed_until';
const SUPPRESSION_MS = 14 * 24 * 60 * 60 * 1000;

function renderAt(pathname: string) {
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <FloatingFeedback />
    </MemoryRouter>
  );
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe('FloatingFeedback', () => {
  it('renders the panel on a page that is not in the hidden list', () => {
    renderAt('/account');
    expect(screen.getByLabelText('Dismiss feedback widget')).toBeInTheDocument();
  });

  it('does not render on /downloads (deck-level prompt owns that surface)', () => {
    renderAt('/downloads');
    expect(screen.queryByLabelText('Dismiss feedback widget')).not.toBeInTheDocument();
  });

  it('does not render on /whats-new (inline rating already lives there)', () => {
    renderAt('/whats-new');
    expect(screen.queryByLabelText('Dismiss feedback widget')).not.toBeInTheDocument();
  });

  it('does not render on /feedback (long-form survey lives there)', () => {
    renderAt('/feedback');
    expect(screen.queryByLabelText('Dismiss feedback widget')).not.toBeInTheDocument();
  });

  it('does not render when suppression timestamp is in the future', () => {
    localStorage.setItem(SUPPRESSED_UNTIL_KEY, String(Date.now() + 1000));
    renderAt('/account');
    expect(screen.queryByLabelText('Dismiss feedback widget')).not.toBeInTheDocument();
  });

  it('renders when suppression timestamp is in the past', () => {
    localStorage.setItem(SUPPRESSED_UNTIL_KEY, String(Date.now() - 1000));
    renderAt('/account');
    expect(screen.getByLabelText('Dismiss feedback widget')).toBeInTheDocument();
  });

  it('writes a 14-day suppression timestamp when dismissed', () => {
    renderAt('/account');
    const dismiss = screen.getByLabelText('Dismiss feedback widget');
    fireEvent.click(dismiss);
    const raw = localStorage.getItem(SUPPRESSED_UNTIL_KEY);
    expect(raw).not.toBeNull();
    const until = Number.parseInt(raw as string, 10);
    const expectedMin = Date.now() + SUPPRESSION_MS - 1000;
    expect(until).toBeGreaterThanOrEqual(expectedMin);
  });

  it('hides itself after dismiss', () => {
    renderAt('/account');
    fireEvent.click(screen.getByLabelText('Dismiss feedback widget'));
    expect(screen.queryByLabelText('Dismiss feedback widget')).not.toBeInTheDocument();
  });
});
