import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../lib/i18n';
import NewPasswordForm from './NewPasswordForm';

vi.mock('../../lib/backend/get2ankiApi', () => ({
  get2ankiApi: () => ({ newPassword: vi.fn() }),
}));

describe('NewPasswordForm in German', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('de');
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('renders the set-password heading and confirm label in German', () => {
    render(<NewPasswordForm setErrorMessage={vi.fn()} />);
    expect(
      screen.getByRole('heading', { name: 'Neues Passwort festlegen' })
    ).toBeInTheDocument();
    expect(screen.getByText('Neues Passwort bestätigen')).toBeInTheDocument();
  });
});
