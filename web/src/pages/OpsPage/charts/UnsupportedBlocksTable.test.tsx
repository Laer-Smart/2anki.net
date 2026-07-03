import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, test } from 'vitest';

import UnsupportedBlocksTable from './UnsupportedBlocksTable';

describe('UnsupportedBlocksTable', () => {
  test('renders one row per block type with occurrences and last seen', () => {
    render(
      <UnsupportedBlocksTable
        rows={[
          {
            block_type: 'html',
            occurrences: 42,
            first_seen: '2026-06-01T00:00:00.000Z',
            last_seen: '2026-07-01T09:30:00.000Z',
          },
          {
            block_type: 'unsupported_widget',
            occurrences: 3,
            first_seen: '2026-06-15T00:00:00.000Z',
            last_seen: '2026-06-20T14:05:00.000Z',
          },
        ]}
      />
    );

    expect(screen.getByText('html')).toBeInTheDocument();
    expect(screen.getByText('unsupported_widget')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('1 Jul 2026, 09:30 UTC')).toBeInTheDocument();
  });

  test('formats occurrence counts of 10 000+ with a thin space separator', () => {
    render(
      <UnsupportedBlocksTable
        rows={[
          {
            block_type: 'html',
            occurrences: 12450,
            first_seen: '2026-06-01T00:00:00.000Z',
            last_seen: '2026-07-01T00:00:00.000Z',
          },
        ]}
      />
    );

    expect(screen.getByText('12 450')).toBeInTheDocument();
  });

  test('renders an empty body when given no rows', () => {
    const { container } = render(<UnsupportedBlocksTable rows={[]} />);
    expect(container.querySelectorAll('tbody tr')).toHaveLength(0);
  });
});
