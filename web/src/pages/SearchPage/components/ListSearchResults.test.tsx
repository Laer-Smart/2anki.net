import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';

import ListSearchResults from './ListSearchResults';

describe('ListSearchResults Hotjar suppression', () => {
  it('suppresses the empty-state headline when it includes a workspace name', () => {
    render(
      <ListSearchResults
        results={[]}
        setFavorites={vi.fn()}
        setError={vi.fn()}
        workSpace="Pristine’s Notion"
      />
    );

    expect(
      screen.getByText('No pages found in “Pristine’s Notion”')
    ).toHaveAttribute('data-hj-suppress');
  });
});
