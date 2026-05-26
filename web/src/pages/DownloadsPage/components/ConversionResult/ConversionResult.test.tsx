import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ConversionResult } from './ConversionResult';
import { parseMonthlyLimitPayload } from './parseMonthlyLimitPayload';

vi.mock('../../../../lib/analytics/track', () => ({ track: vi.fn() }));
vi.mock('../../../../lib/analytics/fireAnalyticsEvent', () => ({
  fireAnalyticsEvent: vi.fn(),
}));

vi.mock('../../hooks/useJobs', () => ({ default: vi.fn() }));

describe('parseMonthlyLimitPayload', () => {
  it('parses valid JSON with code monthly_limit', () => {
    const json = JSON.stringify({
      code: 'monthly_limit',
      cards_used: 80,
      limit: 100,
      reset_on: '2026-07-01T00:00:00.000Z',
    });
    expect(parseMonthlyLimitPayload(json)).toMatchObject({
      code: 'monthly_limit',
      cards_used: 80,
      limit: 100,
    });
  });

  it('returns null for plain text (old job format)', () => {
    expect(parseMonthlyLimitPayload('Monthly card limit reached')).toBeNull();
  });

  it('returns null for JSON with wrong code', () => {
    expect(parseMonthlyLimitPayload(JSON.stringify({ code: 'other' }))).toBeNull();
  });

  it('returns null for null input', () => {
    expect(parseMonthlyLimitPayload(null)).toBeNull();
  });
});

describe('ConversionResult — paywalled variant', () => {
  it('shows Your monthly limit headline with the actual limit value from the payload', () => {
    render(
      <MemoryRouter>
        <ConversionResult
          variant="paywalled"
          title="Big deck"
          limit={100}
          email="user@example.com"
        />
      </MemoryRouter>
    );

    expect(screen.getByText('Your monthly limit: 100 cards')).toBeInTheDocument();
  });

  it('renders Upgrade to Unlimited CTA with ref=downloads-paywall', () => {
    render(
      <MemoryRouter>
        <ConversionResult
          variant="paywalled"
          title="Big deck"
          limit={100}
          email="user@example.com"
        />
      </MemoryRouter>
    );

    const cta = screen.getByRole('link', { name: 'Upgrade to Unlimited' });
    expect(cta.getAttribute('href')).toContain('ref=downloads-paywall');
  });

  it('renders See all plans link pointing to /pricing', () => {
    render(
      <MemoryRouter>
        <ConversionResult
          variant="paywalled"
          title="Big deck"
          limit={100}
          email="user@example.com"
        />
      </MemoryRouter>
    );

    const link = screen.getByRole('link', { name: 'See all plans' });
    expect(link.getAttribute('href')).toBe('/pricing');
  });
});

describe('ConversionResult — failed variant', () => {
  it('renders the error message from classifyUploadError', () => {
    render(
      <MemoryRouter>
        <ConversionResult
          variant="failed"
          title="Bad deck"
          failureReason="too_large: file exceeds limit"
          source="upload"
          onMapColumns={vi.fn()}
        />
      </MemoryRouter>
    );

    expect(screen.queryByRole('link', { name: 'Upgrade to Unlimited' })).toBeNull();
  });

  it('renders notion token expired reconnect link when source is notion and reason is notion_token_expired', () => {
    render(
      <MemoryRouter>
        <ConversionResult
          variant="failed"
          title="Notion page"
          failureReason="notion_token_expired"
          source="notion"
          onMapColumns={vi.fn()}
        />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: 'Reconnect Notion' })).toBeInTheDocument();
  });

  it('shows a subpages recovery hint when the server reports a too-large OOM failure', () => {
    const tooLargeReason =
      'This page is too large for us to convert in one go. Split it into smaller pages — or convert it section by section — and try again.';
    render(
      <MemoryRouter>
        <ConversionResult
          variant="failed"
          title="Big Notion export"
          failureReason={tooLargeReason}
          source="notion"
          onMapColumns={vi.fn()}
        />
      </MemoryRouter>
    );

    expect(screen.getByText(/subpage/i)).toBeInTheDocument();
  });
});
