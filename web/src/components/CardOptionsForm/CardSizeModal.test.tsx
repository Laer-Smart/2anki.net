import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import { CardSizeModal } from './CardSizeModal';

describe('CardSizeModal', () => {
  it('marks the current value as pressed', () => {
    render(
      <CardSizeModal
        isOpen
        onClose={() => undefined}
        value="detailed"
        onChange={() => undefined}
      />
    );
    expect(screen.getByRole('button', { name: 'Detailed' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: 'Medium' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('calls onChange with the picked size', () => {
    const onChange = vi.fn();
    render(
      <CardSizeModal
        isOpen
        onClose={() => undefined}
        value="medium"
        onChange={onChange}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Short' }));
    expect(onChange).toHaveBeenCalledWith('short');
  });

  it('closes when Done is clicked', () => {
    const onClose = vi.fn();
    render(
      <CardSizeModal
        isOpen
        onClose={onClose}
        value="medium"
        onChange={() => undefined}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
