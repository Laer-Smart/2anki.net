import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, test } from 'vitest';

import OutboundLatencyTable from './OutboundLatencyTable';

describe('OutboundLatencyTable', () => {
  test('renders one row per service with percentile cells', () => {
    render(
      <OutboundLatencyTable
        rows={[
          {
            service: 'notion',
            p50_ms: 110,
            p95_ms: 460,
            p99_ms: 820,
            count: 250,
          },
          {
            service: 'claude',
            p50_ms: 380,
            p95_ms: 1200,
            p99_ms: 2100,
            count: 90,
          },
        ]}
      />
    );

    expect(screen.getByText('notion')).toBeInTheDocument();
    expect(screen.getByText('claude')).toBeInTheDocument();
    expect(screen.getByText('110 ms')).toBeInTheDocument();
    expect(screen.getByText('460 ms')).toBeInTheDocument();
    expect(screen.getByText('1.20 s')).toBeInTheDocument();
    expect(screen.getByText('2.10 s')).toBeInTheDocument();
  });

  test('formats counts of 10 000+ with a thin space separator', () => {
    render(
      <OutboundLatencyTable
        rows={[
          {
            service: 'notion',
            p50_ms: 80,
            p95_ms: 200,
            p99_ms: 500,
            count: 12450,
          },
        ]}
      />
    );

    expect(screen.getByText('12 450')).toBeInTheDocument();
  });

  test('renders an empty body when given no rows', () => {
    const { container } = render(<OutboundLatencyTable rows={[]} />);
    expect(container.querySelectorAll('tbody tr')).toHaveLength(0);
  });
});
