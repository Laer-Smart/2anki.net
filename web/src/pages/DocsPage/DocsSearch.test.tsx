import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

const navigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>(
      'react-router-dom'
    );
  return { ...actual, useNavigate: () => navigate };
});

import { DocsSearch } from './DocsSearch';

function renderSearch(onClose = vi.fn()) {
  return render(
    <MemoryRouter>
      <DocsSearch isOpen onClose={onClose} />
    </MemoryRouter>
  );
}

describe('DocsSearch', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <MemoryRouter>
        <DocsSearch isOpen={false} onClose={vi.fn()} />
      </MemoryRouter>
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows popular docs before the user types', () => {
    renderSearch();
    expect(
      screen.getByRole('option', { name: /Connect Notion/i })
    ).toBeInTheDocument();
  });

  it('filters results as the user types', () => {
    renderSearch();
    fireEvent.change(screen.getByLabelText('Search the docs'), {
      target: { value: 'occlusion' },
    });
    const options = screen.getAllByRole('option');
    expect(options[0]).toHaveTextContent('Image occlusion');
  });

  it('navigates to the selected result on Enter', () => {
    navigate.mockClear();
    renderSearch();
    const input = screen.getByLabelText('Search the docs');
    fireEvent.change(input, { target: { value: 'image occlusion' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(navigate).toHaveBeenCalledWith(
      '/documentation/cards/image-occlusion'
    );
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    renderSearch(onClose);
    fireEvent.keyDown(screen.getByLabelText('Search the docs'), {
      key: 'Escape',
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows a no-results message that echoes the query', () => {
    renderSearch();
    fireEvent.change(screen.getByLabelText('Search the docs'), {
      target: { value: 'zzzznomatch' },
    });
    expect(screen.getByText(/No docs match/i)).toBeInTheDocument();
    expect(screen.getByText('zzzznomatch')).toBeInTheDocument();
  });
});
