import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CancellationFollowUp } from './CancellationFollowUp';

describe('CancellationFollowUp', () => {
  it('keeps Send disabled until a reason is selected', () => {
    render(
      <CancellationFollowUp
        onSubmit={vi.fn()}
        onSkip={vi.fn()}
        isSubmitting={false}
      />
    );

    expect(screen.getByRole('button', { name: 'Send feedback' })).toBeDisabled();

    fireEvent.click(screen.getByLabelText('Too expensive'));

    expect(
      screen.getByRole('button', { name: 'Send feedback' })
    ).not.toBeDisabled();
  });

  it('submits the selected reason and trimmed comment', () => {
    const onSubmit = vi.fn();
    render(
      <CancellationFollowUp
        onSubmit={onSubmit}
        onSkip={vi.fn()}
        isSubmitting={false}
      />
    );

    fireEvent.click(screen.getByLabelText('Too expensive'));
    fireEvent.click(screen.getByRole('button', { name: 'Send feedback' }));

    expect(onSubmit).toHaveBeenCalledWith('Too expensive', '');
  });

  it('calls onSkip without submitting when Skip is clicked', () => {
    const onSubmit = vi.fn();
    const onSkip = vi.fn();
    render(
      <CancellationFollowUp
        onSubmit={onSubmit}
        onSkip={onSkip}
        isSubmitting={false}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));

    expect(onSkip).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
