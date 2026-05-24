import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it } from 'vitest';
import { WithNotionLink } from './WithNotionLink';

describe('WithNotionLink', () => {
  it('renders a link to the Notion auth init endpoint', () => {
    render(<WithNotionLink text="Continue with Notion" />);
    const link = screen.getByRole('link', { name: /Continue with Notion/i });
    expect(link).toHaveAttribute('href', '/api/users/auth/notion/init');
  });

  it('displays the provided text', () => {
    render(<WithNotionLink text="Sign in with Notion" />);
    expect(screen.getByText('Sign in with Notion')).toBeInTheDocument();
  });

  it('card variant shows the short "Notion" label and keeps the full text as accessible name', () => {
    render(<WithNotionLink text="Continue with Notion" variant="card" />);
    expect(screen.getByText('Notion')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Continue with Notion' })
    ).toBeInTheDocument();
  });
});
