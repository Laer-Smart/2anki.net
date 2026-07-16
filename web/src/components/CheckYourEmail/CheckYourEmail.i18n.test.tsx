import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../lib/i18n';
import CheckYourEmail from './CheckYourEmail';

describe('CheckYourEmail in German', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('de');
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('renders the check-your-email heading in German', () => {
    render(
      <CheckYourEmail
        email="test@example.com"
        onRetry={vi.fn()}
        purpose="login"
      />
    );
    expect(
      screen.getByRole('heading', { name: 'Sieh in deinem Postfach nach' })
    ).toBeInTheDocument();
  });

  it('translates the try-again link', () => {
    render(
      <CheckYourEmail
        email="test@example.com"
        onRetry={vi.fn()}
        purpose="password_reset"
      />
    );
    expect(
      screen.getByRole('link', { name: 'versuch es erneut' })
    ).toBeInTheDocument();
  });
});
