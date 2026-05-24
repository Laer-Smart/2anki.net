import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it } from 'vitest';
import { WithMicrosoftLink } from './WithMicrosoftLink';

describe('WithMicrosoftLink', () => {
  it('renders a link to the Microsoft authorize endpoint', () => {
    render(<WithMicrosoftLink text="Sign in with Microsoft" />);
    const link = screen.getByRole('link', {
      name: /Sign in with Microsoft/i,
    });
    expect(link.getAttribute('href')).toContain(
      'login.microsoftonline.com/common/oauth2/v2.0/authorize'
    );
  });

  it('displays the provided text', () => {
    render(<WithMicrosoftLink text="Sign up with Microsoft" />);
    expect(screen.getByText('Sign up with Microsoft')).toBeInTheDocument();
  });

  it('card variant shows the short "Microsoft" label and keeps the full text as accessible name', () => {
    render(
      <WithMicrosoftLink text="Sign in with Microsoft" variant="card" />
    );
    expect(screen.getByText('Microsoft')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Sign in with Microsoft' })
    ).toBeInTheDocument();
  });
});
