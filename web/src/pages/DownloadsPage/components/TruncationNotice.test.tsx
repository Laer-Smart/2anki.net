import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { TruncationNotice } from './TruncationNotice';
import { track } from '../../../lib/analytics/track';

vi.mock('../../../lib/analytics/track', () => ({
  track: vi.fn(),
}));

function renderNotice(subDeckRulesSkipped: boolean) {
  return render(
    <MemoryRouter>
      <TruncationNotice
        blocksConverted={100}
        subDeckRulesSkipped={subDeckRulesSkipped}
      />
    </MemoryRouter>
  );
}

describe('TruncationNotice', () => {
  beforeEach(() => {
    vi.mocked(track).mockClear();
  });

  it('names the converted block count and links to pricing', () => {
    renderNotice(false);

    expect(
      screen.getByText(
        /Converted the first 100 blocks\. The free plan stops there/
      )
    ).toBeInTheDocument();
    const link = screen.getByRole('link', {
      name: 'upgrade to convert the whole page',
    });
    expect(link).toHaveAttribute(
      'href',
      '/pricing?source=truncated-conversion'
    );
  });

  it('omits the sub-deck line when no rules were skipped', () => {
    renderNotice(false);

    expect(
      screen.queryByText(/Sub-deck rules from toggles, headings, and databases/)
    ).not.toBeInTheDocument();
  });

  it('adds the sub-deck line when rule-based sub-decks were skipped', () => {
    renderNotice(true);

    expect(
      screen.getByText(
        /Sub-deck rules from toggles, headings, and databases apply on paid plans — this deck converted without them\./
      )
    ).toBeInTheDocument();
  });

  it('fires paywall_shown with the truncated_notice surface on render', () => {
    renderNotice(false);

    expect(track).toHaveBeenCalledWith('paywall_shown', {
      surface: 'truncated_notice',
    });
    expect(track).toHaveBeenCalledTimes(1);
  });
});
