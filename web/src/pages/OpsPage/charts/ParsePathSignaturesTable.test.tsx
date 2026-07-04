import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, test } from 'vitest';

import ParsePathSignaturesTable from './ParsePathSignaturesTable';

describe('ParsePathSignaturesTable', () => {
  test('renders one row per parse path with occurrences and last seen', () => {
    render(
      <ParsePathSignaturesTable
        rows={[
          {
            parse_path: 'unclassified',
            occurrences: 5,
            first_seen: '2026-06-01T00:00:00.000Z',
            last_seen: '2026-07-01T09:30:00.000Z',
          },
          {
            parse_path: 'recognized',
            occurrences: 4210,
            first_seen: '2026-06-15T00:00:00.000Z',
            last_seen: '2026-06-20T14:05:00.000Z',
          },
        ]}
      />
    );

    expect(screen.getByText('unclassified')).toBeInTheDocument();
    expect(screen.getByText('recognized')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('1 Jul 2026, 09:30 UTC')).toBeInTheDocument();
  });

  test('renders an empty body when given no rows', () => {
    const { container } = render(<ParsePathSignaturesTable rows={[]} />);
    expect(container.querySelectorAll('tbody tr')).toHaveLength(0);
  });
});
