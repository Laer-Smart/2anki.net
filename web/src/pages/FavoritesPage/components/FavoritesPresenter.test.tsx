import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import FavoritesPresenter from './FavoritesPresenter';

function renderPresenter(favorites: any[] = []) {
  return render(
    <MemoryRouter>
      <FavoritesPresenter
        favorites={favorites}
        setError={vi.fn()}
        setFavorites={vi.fn()}
      />
    </MemoryRouter>
  );
}

describe('FavoritesPresenter', () => {
  it('links to the shared-decks library when there are no favorites', () => {
    renderPresenter([]);
    const link = screen.getByRole('link', {
      name: 'Browse the shared library',
    });
    expect(link).toHaveAttribute('href', '/shared-decks');
  });

  it('does not render the library link when favorites exist', () => {
    renderPresenter([
      {
        object: 'page',
        title: 'Biology',
        url: 'https://notion.so/x',
        id: 'page-1',
      } as any,
    ]);
    expect(
      screen.queryByRole('link', { name: 'Browse the shared library' })
    ).not.toBeInTheDocument();
  });
});
