import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { CookiesProvider } from 'react-cookie';
import i18n from '../../../../lib/i18n';
import LoginForm from './index';

vi.mock('../../../../lib/backend/get2ankiApi', () => ({
  get2ankiApi: () => ({
    login: vi.fn(),
    requestMagicLink: vi.fn(),
  }),
}));

function renderLoginForm() {
  return render(
    <CookiesProvider>
      <MemoryRouter initialEntries={['/login']}>
        <LoginForm />
      </MemoryRouter>
    </CookiesProvider>
  );
}

describe('LoginForm in German', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('de');
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('renders the heading in German', () => {
    renderLoginForm();
    expect(
      screen.getByRole('heading', { name: 'Bei 2anki anmelden' })
    ).toBeInTheDocument();
  });

  it('translates the primary sign-in-link CTA', () => {
    renderLoginForm();
    expect(
      screen.getByRole('button', { name: 'Anmeldelink per E-Mail senden' })
    ).toBeInTheDocument();
  });

  it('keeps the Google OAuth label in English', () => {
    renderLoginForm();
    expect(
      screen.getByRole('link', { name: 'Sign in with Google' })
    ).toBeInTheDocument();
  });
});
