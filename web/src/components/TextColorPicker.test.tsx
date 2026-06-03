import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';
import TextColorPicker from './TextColorPicker';

describe('TextColorPicker', () => {
  it('marks the Default chip selected when the value is empty', () => {
    render(<TextColorPicker textColor="" pickedTextColor={() => {}} />);
    const defaultChip = screen.getByRole('button', { name: 'Default' });
    expect(defaultChip).toHaveAttribute('aria-pressed', 'true');
  });

  it('marks the matching swatch selected when a hex is set', () => {
    render(<TextColorPicker textColor="#1f6feb" pickedTextColor={() => {}} />);
    expect(screen.getByRole('button', { name: 'Blue' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: 'Default' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('fires onChange with the swatch hex when a colour is clicked', () => {
    const onChange = vi.fn();
    render(<TextColorPicker textColor="" pickedTextColor={onChange} />);
    screen.getByRole('button', { name: 'Green' }).click();
    expect(onChange).toHaveBeenCalledWith('#1a7f37');
  });

  it('fires onChange with an empty string when Default is clicked', () => {
    const onChange = vi.fn();
    render(<TextColorPicker textColor="#1f6feb" pickedTextColor={onChange} />);
    screen.getByRole('button', { name: 'Default' }).click();
    expect(onChange).toHaveBeenCalledWith('');
  });
});
