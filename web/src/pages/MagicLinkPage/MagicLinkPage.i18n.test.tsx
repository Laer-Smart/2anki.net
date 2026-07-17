import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { CookiesProvider } from 'react-cookie';
import i18n from '../../lib/i18n';
import MagicLinkPage from './MagicLinkPage';

vi.mock('../../lib/backend/get2ankiApi', () => ({
  get2ankiApi: () => ({
    validateMagicToken: vi.fn(),
    requestMagicLink: vi.fn(),
  }),
}));

describe('MagicLinkPage in German', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('de');
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('renders the expired-link chrome in German', () => {
    render(
      <CookiesProvider>
        <MemoryRouter initialEntries={['/auth/magic']}>
          <MagicLinkPage />
        </MemoryRouter>
      </CookiesProvider>
    );

    expect(
      screen.getByRole('heading', { name: 'Link abgelaufen oder ungültig' })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Dieser Link ist ungültig oder abgelaufen. Fordere einen neuen an.'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('E-Mail')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('E-Mail-Adresse')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Neuen Link senden' })
    ).toBeInTheDocument();
  });
});
