import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MindmapLimitModal } from './MindmapLimitModal';

function renderModal(limit: number) {
  return render(
    <MemoryRouter>
      <MindmapLimitModal limit={limit} onClose={() => {}} />
    </MemoryRouter>
  );
}

describe('MindmapLimitModal', () => {
  it('offers a generic upgrade line', () => {
    renderModal(3);
    expect(screen.getByText(/Upgrade for unlimited mind maps\./)).toBeDefined();
  });

  it('does not mention Auto Sync', () => {
    const { container } = renderModal(3);
    expect(container.textContent).not.toMatch(/Auto[\s-]?Sync/i);
  });

  it('renders the free cap when the limit is 3', () => {
    renderModal(3);
    expect(screen.getByText(/limit of 3 mind maps/)).toBeDefined();
    expect(screen.getByText(/includes 3 mind maps/)).toBeDefined();
  });

  it('renders the subscriber cap when the limit is 25', () => {
    renderModal(25);
    expect(screen.getByText(/limit of 25 mind maps/)).toBeDefined();
    expect(screen.getByText(/includes 25 mind maps/)).toBeDefined();
  });
});
