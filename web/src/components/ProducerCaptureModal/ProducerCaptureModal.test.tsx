import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { ProducerCaptureModal } from './ProducerCaptureModal';

const mockTrack = vi.fn();

vi.mock('../../lib/analytics/track', () => ({
  track: (...args: unknown[]) => mockTrack(...args),
}));

beforeEach(() => {
  mockTrack.mockReset();
});

function fillForm() {
  fireEvent.change(screen.getByLabelText('What are you making decks for?'), {
    target: { value: 'MCAT tutoring for a cohort' },
  });
  fireEvent.change(screen.getByLabelText('How many people will use them?'), {
    target: { value: '2–10' },
  });
}

describe('ProducerCaptureModal', () => {
  it('disables submit until both fields are set', () => {
    render(
      <ProducerCaptureModal isOpen source="pricing_page" onClose={vi.fn()} />
    );
    const submit = screen.getByRole('button', {
      name: 'Join the early-access list',
    });
    expect(submit).toBeDisabled();
    fillForm();
    expect(submit).toBeEnabled();
  });

  it('fires producer_intent_captured with safe keys and source on submit', async () => {
    render(
      <ProducerCaptureModal
        isOpen
        source="heavy_uploader_prompt"
        onClose={vi.fn()}
      />
    );
    fillForm();
    fireEvent.click(
      screen.getByRole('button', { name: 'Join the early-access list' })
    );
    await waitFor(() =>
      expect(mockTrack).toHaveBeenCalledWith('producer_intent_captured', {
        source: 'heavy_uploader_prompt',
        team_size: '2–10',
        purpose: 'MCAT tutoring for a cohort',
      })
    );
  });

  it('swaps to the thank-you view after a successful submit', async () => {
    render(
      <ProducerCaptureModal
        isOpen
        source="pricing_page"
        onClose={vi.fn()}
        onSubmit={() => Promise.resolve()}
      />
    );
    fillForm();
    fireEvent.click(
      screen.getByRole('button', { name: 'Join the early-access list' })
    );
    expect(await screen.findByText("You're on the list")).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Join the early-access list' })
    ).not.toBeInTheDocument();
  });

  it('keeps typed values and shows an inline error when submit fails', async () => {
    render(
      <ProducerCaptureModal
        isOpen
        source="heavy_uploader_prompt"
        onClose={vi.fn()}
        onSubmit={() => Promise.reject(new Error('network'))}
      />
    );
    fillForm();
    fireEvent.click(
      screen.getByRole('button', { name: 'Join the early-access list' })
    );
    expect(
      await screen.findByText(
        "Couldn't save that — check your connection and try again."
      )
    ).toBeInTheDocument();
    expect(screen.getByLabelText('What are you making decks for?')).toHaveValue(
      'MCAT tutoring for a cohort'
    );
    expect(screen.queryByText("You're on the list")).not.toBeInTheDocument();
  });
});
