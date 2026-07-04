import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, test } from 'vitest';

import ConversionOutputTable from './ConversionOutputTable';

describe('ConversionOutputTable', () => {
  test('renders one row per source with cards, empty backs, and empty-back percent', () => {
    render(
      <ConversionOutputTable
        rows={[
          {
            source: 'upload',
            decks: 3,
            cards: 200,
            empty_back_cards: 10,
            first_seen: '2026-06-01T00:00:00.000Z',
            last_seen: '2026-07-01T09:30:00.000Z',
          },
        ]}
      />
    );

    expect(screen.getByText('upload')).toBeInTheDocument();
    expect(screen.getByText('200')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('5.0%')).toBeInTheDocument();
    expect(screen.getByText('1 Jul 2026, 09:30 UTC')).toBeInTheDocument();
  });

  test('shows 0.0% when a source produced no cards', () => {
    render(
      <ConversionOutputTable
        rows={[
          {
            source: 'convert',
            decks: 0,
            cards: 0,
            empty_back_cards: 0,
            first_seen: '2026-06-01T00:00:00.000Z',
            last_seen: '2026-07-01T00:00:00.000Z',
          },
        ]}
      />
    );

    expect(screen.getByText('0.0%')).toBeInTheDocument();
  });

  test('renders an empty body when given no rows', () => {
    const { container } = render(<ConversionOutputTable rows={[]} />);
    expect(container.querySelectorAll('tbody tr')).toHaveLength(0);
  });
});
