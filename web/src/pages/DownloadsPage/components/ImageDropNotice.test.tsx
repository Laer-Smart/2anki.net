import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ImageDropNotice } from './ImageDropNotice';
import { track } from '../../../lib/analytics/track';

vi.mock('../../../lib/analytics/track', () => ({
  track: vi.fn(),
}));

describe('ImageDropNotice', () => {
  beforeEach(() => {
    vi.mocked(track).mockClear();
  });

  it('uses singular copy for one dropped image', () => {
    render(<ImageDropNotice count={1} />);
    expect(
      screen.getByText(
        /1 image couldn't be downloaded and isn't in this deck\./
      )
    ).toBeInTheDocument();
  });

  it('uses plural copy and the count for multiple dropped images', () => {
    render(<ImageDropNotice count={4} />);
    expect(
      screen.getByText(
        /4 images couldn't be downloaded and aren't in this deck\./
      )
    ).toBeInTheDocument();
  });

  it('fires the usage event with the dropped count on mount', () => {
    render(<ImageDropNotice count={3} />);
    expect(track).toHaveBeenCalledWith('image_drop_notice_shown', {
      dropped_count: 3,
    });
  });
});
