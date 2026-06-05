import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Footer from './Footer';

describe('Footer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-10T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the copyright with the current year and the founder name', () => {
    render(<Footer />);
    expect(
      screen.getByText(/© 2020–2026 Alexander Alemayhu/)
    ).toBeInTheDocument();
  });

  it('links About, Docs, Contact, Terms, Privacy', () => {
    render(<Footer />);
    expect(screen.getByRole('link', { name: 'About' })).toHaveAttribute(
      'href',
      '/about'
    );
    expect(screen.getByRole('link', { name: 'Docs' })).toHaveAttribute(
      'href',
      '/documentation'
    );
    expect(screen.getByRole('link', { name: 'Contact' })).toHaveAttribute(
      'href',
      '/contact'
    );
    expect(
      screen.getByRole('link', { name: 'iOS and macOS app' })
    ).toHaveAttribute('href', '/app');
    expect(screen.getByRole('link', { name: 'Terms' })).toHaveAttribute(
      'href',
      '/documentation/misc/terms-of-service'
    );
    expect(screen.getByRole('link', { name: 'Privacy' })).toHaveAttribute(
      'href',
      '/documentation/misc/privacy-policy'
    );
  });

  it('renders Docs label, not the long Documentation label', () => {
    render(<Footer />);
    expect(
      screen.queryByRole('link', { name: 'Documentation' })
    ).not.toBeInTheDocument();
  });

  it('attributes the DigitalOcean sponsorship with a link to digitalocean.com', () => {
    render(<Footer />);
    const sponsor = screen.getByRole('link', {
      name: 'Supported by DigitalOcean',
    });
    expect(sponsor).toHaveAttribute(
      'href',
      'https://www.digitalocean.com/?utm_medium=opensource&utm_source=2anki'
    );
    expect(screen.getByAltText('DigitalOcean')).toBeInTheDocument();
  });
});
