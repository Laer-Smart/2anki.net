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

describe('ConversionResult — success variant', () => {
  it('renders deck name, card count, and Download deck button', () => {
    render(
      <MemoryRouter>
        <ConversionResult
          variant="success"
          title="Biology Chapter 4"
          cardCount={42}
          downloadKey="bio-ch4.apkg"
          onDownload={vi.fn()}
        />
      </MemoryRouter>
    );

    expect(screen.getByText('Biology Chapter 4')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Download Biology Chapter 4/ })).toBeInTheDocument();
  });

  it('truncates deck name at 40 chars and keeps full name in title attribute', () => {
    const longName = 'A'.repeat(50);
    render(
      <MemoryRouter>
        <ConversionResult
          variant="success"
          title={longName}
          cardCount={10}
          downloadKey="deck.apkg"
          onDownload={vi.fn()}
        />
      </MemoryRouter>
    );

    const nameEl = screen.getByTitle(longName);
    expect(nameEl.textContent).toBe(`${'A'.repeat(40)}…`);
  });

  it('shows Ready to download helper text', () => {
    render(
      <MemoryRouter>
        <ConversionResult
          variant="success"
          title="My deck"
          cardCount={5}
          downloadKey="deck.apkg"
          onDownload={vi.fn()}
        />
      </MemoryRouter>
    );

    expect(screen.getByText('Ready to download.')).toBeInTheDocument();
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
});
