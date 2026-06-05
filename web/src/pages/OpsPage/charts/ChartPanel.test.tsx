import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, test } from 'vitest';

import ChartPanel from './ChartPanel';
import styles from '../OpsPage.module.css';

describe('ChartPanel', () => {
  test('renders the loading skeleton when isLoading', () => {
    const { container } = render(
      <ChartPanel title="Latency" isLoading isEmpty={false} emptyText="No data">
        <div>actual content</div>
      </ChartPanel>
    );
    expect(container.querySelector(`.${styles.skeletonBar}`)).not.toBeNull();
    expect(screen.queryByText('actual content')).toBeNull();
  });

  test('renders the empty state text when isEmpty and not loading', () => {
    render(
      <ChartPanel
        title="Latency"
        isLoading={false}
        isEmpty
        emptyText="No data in this window."
      >
        <div>actual content</div>
      </ChartPanel>
    );
    expect(screen.getByText('No data in this window.')).toBeInTheDocument();
    expect(screen.queryByText('actual content')).toBeNull();
  });

  test('renders children when not loading and not empty', () => {
    render(
      <ChartPanel
        title="Latency"
        isLoading={false}
        isEmpty={false}
        emptyText="No data"
      >
        <div>actual content</div>
      </ChartPanel>
    );
    expect(screen.getByText('actual content')).toBeInTheDocument();
  });

  test('uses the fixed-height frame by default', () => {
    const { container } = render(
      <ChartPanel
        title="Latency"
        isLoading={false}
        isEmpty={false}
        emptyText="No data"
      >
        <div>x</div>
      </ChartPanel>
    );
    expect(container.querySelector(`.${styles.chartFrame}`)).not.toBeNull();
    expect(container.querySelector(`.${styles.chartFrameAuto}`)).toBeNull();
  });

  test('uses the auto-height frame when autoHeight is true', () => {
    const { container } = render(
      <ChartPanel
        title="Slowest jobs"
        isLoading={false}
        isEmpty={false}
        emptyText="No data"
        autoHeight
      >
        <div>x</div>
      </ChartPanel>
    );
    expect(container.querySelector(`.${styles.chartFrameAuto}`)).not.toBeNull();
    expect(container.querySelector(`.${styles.chartFrame}`)).toBeNull();
  });
});
