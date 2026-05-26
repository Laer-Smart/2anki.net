import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import { ConfigureRow } from './ConfigureRow';

describe('ConfigureRow', () => {
  it('shows the label and the current-value summary', () => {
    render(
      <ConfigureRow
        label="Card size"
        summary="Medium"
        onConfigure={() => undefined}
      />
    );
    expect(screen.getByText('Card size')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
  });

  it('calls onConfigure when the Configure button is clicked', () => {
    const onConfigure = vi.fn();
    render(<ConfigureRow label="MCQ" summary="Off" onConfigure={onConfigure} />);
    fireEvent.click(screen.getByRole('button', { name: 'Configure MCQ' }));
    expect(onConfigure).toHaveBeenCalledTimes(1);
  });

  it('renders a badge when provided', () => {
    render(
      <ConfigureRow
        label="Field mapping"
        summary="Default"
        onConfigure={() => undefined}
        badge="Premium"
      />
    );
    expect(screen.getByText('Premium')).toBeInTheDocument();
  });

  it('renders an info hint button when a hint is provided', () => {
    render(
      <ConfigureRow
        label="Card size"
        summary="Medium"
        hint="How much text the AI fits on each card."
        onConfigure={() => undefined}
      />
    );
    expect(
      screen.getByRole('button', {
        name: 'How much text the AI fits on each card.',
      })
    ).toBeInTheDocument();
  });
});
