import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PassCards } from './PassCards';

describe('PassCards', () => {
  it('renders Day Pass and Week Pass cards side by side', () => {
    render(
      <PassCards
        onDayPass={vi.fn()}
        onWeekPass={vi.fn()}
        dayPassPending={false}
        weekPassPending={false}
      />
    );
    expect(
      screen.getByRole('button', { name: 'Get Day Pass' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Get Week Pass' })
    ).toBeInTheDocument();
  });

  it('does not hide the pass cards behind an accordion', () => {
    const { container } = render(
      <PassCards
        onDayPass={vi.fn()}
        onWeekPass={vi.fn()}
        dayPassPending={false}
        weekPassPending={false}
      />
    );
    expect(container.querySelector('details')).toBeNull();
  });

  it('shows the No subscription benefit on each card', () => {
    render(
      <PassCards
        onDayPass={vi.fn()}
        onWeekPass={vi.fn()}
        dayPassPending={false}
        weekPassPending={false}
      />
    );
    expect(screen.getAllByText('No subscription').length).toBe(2);
  });

  it('does not list No ads — the whole product is ad-free', () => {
    render(
      <PassCards
        onDayPass={vi.fn()}
        onWeekPass={vi.fn()}
        dayPassPending={false}
        weekPassPending={false}
      />
    );
    expect(screen.queryByText('No ads')).not.toBeInTheDocument();
  });

  it('calls onDayPass when Get Day Pass is clicked', () => {
    const onDayPass = vi.fn();
    render(
      <PassCards
        onDayPass={onDayPass}
        onWeekPass={vi.fn()}
        dayPassPending={false}
        weekPassPending={false}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Get Day Pass' }));
    expect(onDayPass).toHaveBeenCalledOnce();
  });

  it('calls onWeekPass when Get Week Pass is clicked', () => {
    const onWeekPass = vi.fn();
    render(
      <PassCards
        onDayPass={vi.fn()}
        onWeekPass={onWeekPass}
        dayPassPending={false}
        weekPassPending={false}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Get Week Pass' }));
    expect(onWeekPass).toHaveBeenCalledOnce();
  });

  it('disables the Day Pass button when dayPassPending', () => {
    render(
      <PassCards
        onDayPass={vi.fn()}
        onWeekPass={vi.fn()}
        dayPassPending={true}
        weekPassPending={false}
      />
    );
    expect(screen.getByRole('button', { name: 'Redirecting…' })).toBeDisabled();
  });

  it('disables the Week Pass button when weekPassPending', () => {
    render(
      <PassCards
        onDayPass={vi.fn()}
        onWeekPass={vi.fn()}
        dayPassPending={false}
        weekPassPending={true}
      />
    );
    expect(screen.getByRole('button', { name: 'Redirecting…' })).toBeDisabled();
  });

  it('renders correct pricing for Day Pass', () => {
    render(
      <PassCards
        onDayPass={vi.fn()}
        onWeekPass={vi.fn()}
        dayPassPending={false}
        weekPassPending={false}
      />
    );
    expect(screen.getByText('$4')).toBeInTheDocument();
  });

  it('renders correct pricing for Week Pass', () => {
    render(
      <PassCards
        onDayPass={vi.fn()}
        onWeekPass={vi.fn()}
        dayPassPending={false}
        weekPassPending={false}
      />
    );
    expect(screen.getByText('$9')).toBeInTheDocument();
  });

  it('features the Day Pass as Most popular without overclaiming on the Week Pass', () => {
    render(
      <PassCards
        onDayPass={vi.fn()}
        onWeekPass={vi.fn()}
        dayPassPending={false}
        weekPassPending={false}
      />
    );
    expect(screen.getByText('Most popular')).toBeInTheDocument();
    expect(screen.queryByText('Best value')).not.toBeInTheDocument();
  });
});
