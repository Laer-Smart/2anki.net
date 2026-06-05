import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MindmapLimitModal } from './MindmapLimitModal';

function renderModal() {
  return render(
    <MemoryRouter>
      <MindmapLimitModal onClose={() => {}} />
    </MemoryRouter>
  );
}

describe('MindmapLimitModal', () => {
  it('offers a generic upgrade line', () => {
    renderModal();
    expect(screen.getByText(/Upgrade for unlimited mind maps\./)).toBeDefined();
  });

  it('does not mention Auto Sync', () => {
    const { container } = renderModal();
    expect(container.textContent).not.toMatch(/Auto[\s-]?Sync/i);
  });
});
