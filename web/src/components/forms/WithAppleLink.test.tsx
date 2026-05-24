import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it } from 'vitest';
import { WithAppleLink } from './WithAppleLink';

describe('WithAppleLink', () => {
  it('renders a link pointing to the Apple init endpoint', () => {
    render(<WithAppleLink text="Sign in with Apple" />);
    const link = screen.getByRole('link', {
      name: /Sign in with Apple/i,
    });
    expect(link.getAttribute('href')).toContain('/api/users/auth/apple/init');
  });

  it('displays the provided text in row variant', () => {
    render(<WithAppleLink text="Sign in with Apple" />);
    expect(screen.getByText('Sign in with Apple')).toBeInTheDocument();
  });

  it('card variant shows the short "Apple" label and keeps the full text as accessible name', () => {
    render(<WithAppleLink text="Sign in with Apple" variant="card" />);
    expect(screen.getByText('Apple')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Sign in with Apple' })
    ).toBeInTheDocument();
  });
});
