import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import i18n from '../../lib/i18n';
import { ContactPage } from './ContactPage';

vi.mock('../../lib/backend/get2ankiApi', () => ({
  get2ankiApi: () => ({ contactUs: vi.fn() }),
}));

describe('ContactPage in German', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('de');
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('renders the title in German', () => {
    render(<ContactPage />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Kontakt aufnehmen' })
    ).toBeInTheDocument();
  });

  it('translates the submit button', () => {
    render(<ContactPage />);
    expect(
      screen.getByRole('button', { name: 'Nachricht senden' })
    ).toBeInTheDocument();
  });

  it('keeps the support email address in the sidebar', () => {
    render(<ContactPage />);
    expect(
      screen.getAllByRole('link', { name: 'support@2anki.net' }).length
    ).toBeGreaterThan(0);
  });
});
