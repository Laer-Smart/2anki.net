import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UnsupportedBlocksNotice } from './UnsupportedBlocksNotice';
import { track } from '../../../lib/analytics/track';

vi.mock('../../../lib/analytics/track', () => ({
  track: vi.fn(),
}));

describe('UnsupportedBlocksNotice', () => {
  beforeEach(() => {
    vi.mocked(track).mockClear();
  });

  it('uses singular copy for one skipped block and names the type', () => {
    render(<UnsupportedBlocksNotice counts={{ child_database: 1 }} />);
    expect(
      screen.getByText(
        /1 block on this page couldn't be converted \(child_database\)\./
      )
    ).toBeInTheDocument();
  });

  it('uses plural copy and sums the counts across types', () => {
    render(
      <UnsupportedBlocksNotice
        counts={{ child_database: 2, synced_block: 1 }}
      />
    );
    expect(
      screen.getByText(
        /3 blocks on this page couldn't be converted \(child_database, synced_block\)\./
      )
    ).toBeInTheDocument();
  });

  it('fires the usage event with the total count and comma-joined types on mount', () => {
    render(
      <UnsupportedBlocksNotice
        counts={{ child_database: 2, synced_block: 1 }}
      />
    );
    expect(track).toHaveBeenCalledWith('unsupported_blocks_notice_shown', {
      count: 3,
      types: 'child_database, synced_block',
    });
  });
});
