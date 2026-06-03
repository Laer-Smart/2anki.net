import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';
import TextAlignPicker from './TextAlignPicker';

describe('TextAlignPicker', () => {
  it('marks the Default chip selected when the value is empty', () => {
    render(<TextAlignPicker textAlign="" pickedTextAlign={() => {}} />);
    const defaultChip = screen.getByRole('button', { name: 'Default' });
    expect(defaultChip).toHaveAttribute('aria-pressed', 'true');
  });

  it('marks the matching option selected when a value is set', () => {
    render(<TextAlignPicker textAlign="left" pickedTextAlign={() => {}} />);
    expect(screen.getByRole('button', { name: 'Left' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: 'Default' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('fires onChange with the option value when an alignment is clicked', () => {
    const onChange = vi.fn();
    render(<TextAlignPicker textAlign="" pickedTextAlign={onChange} />);
    screen.getByRole('button', { name: 'Left' }).click();
    expect(onChange).toHaveBeenCalledWith('left');
  });

  it('fires onChange with an empty string when Default is clicked', () => {
    const onChange = vi.fn();
    render(<TextAlignPicker textAlign="left" pickedTextAlign={onChange} />);
    screen.getByRole('button', { name: 'Default' }).click();
    expect(onChange).toHaveBeenCalledWith('');
  });
});
