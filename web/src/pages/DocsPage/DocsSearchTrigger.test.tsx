import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DocsSearchTrigger } from './DocsSearchTrigger';

describe('DocsSearchTrigger', () => {
  it('renders the search label and shortcut hint', () => {
    render(<DocsSearchTrigger onOpen={vi.fn()} />);
    expect(screen.getByText('Search docs')).toBeInTheDocument();
    expect(screen.getByText('⌘K')).toBeInTheDocument();
  });

  it('calls onOpen when clicked', () => {
    const onOpen = vi.fn();
    render(<DocsSearchTrigger onOpen={onOpen} />);
    fireEvent.click(screen.getByRole('button', { name: /Search docs/i }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
