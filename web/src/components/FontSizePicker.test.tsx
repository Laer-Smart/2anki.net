import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import FontSizePicker from './FontSizePicker';

describe('FontSizePicker live preview', () => {
  it('renders a sample at the chosen pixel size', () => {
    render(<FontSizePicker fontSize="42" pickedFontSize={() => undefined} />);
    const sample = screen.getByText('Sample card text');
    expect(sample).toHaveStyle({ fontSize: '42px' });
  });

  it('falls back to 20 px when no size is set', () => {
    render(<FontSizePicker fontSize="" pickedFontSize={() => undefined} />);
    expect(screen.getByText('Sample card text')).toHaveStyle({
      fontSize: '20px',
    });
  });

  it('shows the numeric readout alongside the sample', () => {
    render(<FontSizePicker fontSize="36" pickedFontSize={() => undefined} />);
    expect(screen.getByText('36 px')).toBeInTheDocument();
  });

  it('reports the new size when the slider moves', () => {
    const pickedFontSize = vi.fn();
    render(<FontSizePicker fontSize="20" pickedFontSize={pickedFontSize} />);
    fireEvent.change(screen.getByRole('slider'), { target: { value: '50' } });
    expect(pickedFontSize).toHaveBeenCalledWith('50');
  });
});
