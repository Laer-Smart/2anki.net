import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ChunkReloadOverlay } from './ChunkReloadOverlay';

describe('ChunkReloadOverlay', () => {
  it('renders the live region with the update message', () => {
    render(<ChunkReloadOverlay />);
    const overlay = screen.getByTestId('chunk-reload-overlay');
    expect(overlay).toBeInTheDocument();
    expect(overlay.getAttribute('role')).toBe('status');
    expect(overlay.getAttribute('aria-live')).toBe('polite');
    expect(
      screen.getByText('Updating to the latest version.')
    ).toBeInTheDocument();
  });
});
