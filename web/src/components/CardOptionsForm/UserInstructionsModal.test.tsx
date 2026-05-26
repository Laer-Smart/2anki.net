import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import { UserInstructionsModal } from './UserInstructionsModal';

describe('UserInstructionsModal', () => {
  it('shows the current instructions in the textarea', () => {
    render(
      <UserInstructionsModal
        isOpen
        onClose={() => undefined}
        value="Focus on high-yield facts"
        onChange={() => undefined}
      />
    );
    expect(screen.getByRole('textbox')).toHaveValue('Focus on high-yield facts');
  });

  it('reports edits through onChange', () => {
    const onChange = vi.fn();
    render(
      <UserInstructionsModal
        isOpen
        onClose={() => undefined}
        value="a"
        onChange={onChange}
      />
    );
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'ab' },
    });
    expect(onChange).toHaveBeenCalledWith('ab');
  });

  it('closes when Done is clicked', () => {
    const onClose = vi.fn();
    render(
      <UserInstructionsModal
        isOpen
        onClose={onClose}
        value=""
        onChange={() => undefined}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
