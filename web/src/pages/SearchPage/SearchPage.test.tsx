import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SearchPage } from './SearchPage';

const mockUseNotionData = vi.fn();

vi.mock('./helpers/useNotionData', () => ({
  default: () => mockUseNotionData(),
}));

vi.mock('./components/SearchContainer', () => ({
  default: () => <div data-testid="search-container" />,
}));

vi.mock('../../lib/backend/get2ankiApi', () => ({
  get2ankiApi: () => ({}),
}));

describe('SearchPage Hotjar suppression', () => {
  beforeEach(() => {
    mockUseNotionData.mockReturnValue({
      connected: true,
      connectionLink: '/api/notion/connect',
      error: null,
      loading: false,
      refetch: vi.fn(),
      workSpace: 'Pristine’s Notion',
    });
  });

  it('suppresses the connected workspace name from Hotjar recordings', () => {
    render(<SearchPage setError={vi.fn()} />);

    expect(screen.getByText('Pristine’s Notion')).toHaveAttribute(
      'data-hj-suppress'
    );
  });
});
