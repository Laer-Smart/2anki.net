import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import i18n from '../../lib/i18n';
import { AccessBanner } from './AccessBanner';

describe('AccessBanner in German', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('de');
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('renders the active pass banner in German and keeps the pass name', () => {
    const now = new Date('2026-07-16T10:00:00Z');
    const expires = new Date('2026-07-17T10:00:00Z').toISOString();
    render(<AccessBanner passExpiresAt={expires} passKind="24h" now={now} />);
    expect(screen.getByText(/Day Pass aktiv/)).toBeInTheDocument();
    expect(
      screen.getByText(/Konvertiere so viel du willst/)
    ).toBeInTheDocument();
  });

  it('renders the ending-soon warning in German', () => {
    const now = new Date('2026-07-16T10:00:00Z');
    const expires = new Date('2026-07-16T10:30:00Z').toISOString();
    render(<AccessBanner passExpiresAt={expires} passKind="7d" now={now} />);
    expect(screen.getByText(/Week Pass endet in/)).toBeInTheDocument();
    expect(screen.getByText(/30 Minuten/)).toBeInTheDocument();
  });
});
