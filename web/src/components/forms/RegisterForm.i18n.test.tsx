import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import i18n from '../../lib/i18n';
import RegisterForm from './RegisterForm';

vi.mock('../../lib/backend/get2ankiApi', () => ({
  get2ankiApi: () => ({ register: vi.fn() }),
}));

vi.mock('../../lib/analytics/track', () => ({ track: vi.fn() }));

function renderRegisterForm() {
  return render(
    <MemoryRouter>
      <RegisterForm setErrorMessage={vi.fn()} redirect={null} />
    </MemoryRouter>
  );
}

describe('RegisterForm in German', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('de');
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('renders the create-account heading in German', () => {
    renderRegisterForm();
    expect(
      screen.getByRole('heading', { name: 'Konto erstellen' })
    ).toBeInTheDocument();
  });

  it('translates the terms-of-service link', () => {
    renderRegisterForm();
    expect(
      screen.getByRole('link', { name: 'Nutzungsbedingungen' })
    ).toBeInTheDocument();
  });
});
