import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AccessBanner } from './AccessBanner';

const NOW = new Date('2026-05-16T12:00:00Z');
const FUTURE_2H = new Date(NOW.getTime() + 2 * 60 * 60 * 1000);
const FUTURE_90MIN = new Date(NOW.getTime() + 90 * 60 * 1000);
const PAST = new Date(NOW.getTime() - 1000);

describe('AccessBanner', () => {
  it('renders nothing when passExpiresAt is null', () => {
    const { container } = render(
      <AccessBanner passExpiresAt={null} passKind={null} now={NOW} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when passKind is null', () => {
    const { container } = render(
      <AccessBanner passExpiresAt={FUTURE_2H.toISOString()} passKind={null} now={NOW} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when pass is expired', () => {
    const { container } = render(
      <AccessBanner passExpiresAt={PAST.toISOString()} passKind="24h" now={NOW} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders active state for Day Pass with >= 2h remaining', () => {
    render(
      <AccessBanner passExpiresAt={FUTURE_2H.toISOString()} passKind="24h" now={NOW} />
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText(/Day Pass active/)).toBeInTheDocument();
    expect(screen.getByText(/Convert as much as you want/)).toBeInTheDocument();
  });

  it('renders active state for Week Pass with >= 2h remaining', () => {
    render(
      <AccessBanner passExpiresAt={FUTURE_2H.toISOString()} passKind="7d" now={NOW} />
    );
    expect(screen.getByText(/Week Pass active/)).toBeInTheDocument();
  });

  it('renders active state for an Unlimited subscription', () => {
    render(
      <AccessBanner passExpiresAt={FUTURE_2H.toISOString()} passKind="unlimited" now={NOW} />
    );
    expect(screen.getByText(/Unlimited active/)).toBeInTheDocument();
  });

  it('renders warning state with < 2h remaining', () => {
    render(
      <AccessBanner passExpiresAt={FUTURE_90MIN.toISOString()} passKind="24h" now={NOW} />
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText(/Day Pass ends in/)).toBeInTheDocument();
    expect(screen.getByText(/finish any pending conversions/)).toBeInTheDocument();
  });

  it('shows time rounded to nearest 10 minutes in warning state (50 min → 50 minutes)', () => {
    const fiftyMin = new Date(NOW.getTime() + 50 * 60 * 1000);
    render(
      <AccessBanner passExpiresAt={fiftyMin.toISOString()} passKind="24h" now={NOW} />
    );
    expect(screen.getByText(/50 minutes/)).toBeInTheDocument();
  });
});
