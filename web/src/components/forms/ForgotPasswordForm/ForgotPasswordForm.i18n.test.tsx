import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../../lib/i18n';
import ForgotPasswordForm from './ForgotPasswordForm';

vi.mock('../../../lib/backend/get2ankiApi', () => ({
  get2ankiApi: () => ({ requestMagicLink: vi.fn() }),
}));

describe('ForgotPasswordForm in German', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('de');
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('renders the reset heading and CTA in German', () => {
    render(<ForgotPasswordForm setError={vi.fn()} />);
    expect(
      screen.getByRole('heading', { name: 'Passwort zurücksetzen' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Link zum Zurücksetzen senden' })
    ).toBeInTheDocument();
  });
});
