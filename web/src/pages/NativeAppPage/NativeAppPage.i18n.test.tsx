import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';

import i18n from '../../lib/i18n';
import NativeAppPage from './NativeAppPage';

vi.mock('../../lib/analytics/track', () => ({ track: vi.fn() }));

vi.mock('../../lib/backend/get2ankiApi', () => ({
  get2ankiApi: () => ({
    getAppStoreLinks: vi.fn().mockResolvedValue({ available: false }),
  }),
}));

function renderPage() {
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <NativeAppPage />
      </MemoryRouter>
    </HelmetProvider>
  );
}

describe('NativeAppPage in German', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('de');
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('renders the hero title in German', async () => {
    renderPage();
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: '2anki für iPhone, iPad und Mac',
      })
    ).toBeInTheDocument();
  });

  it('translates the FAQ heading', () => {
    renderPage();
    expect(
      screen.getByRole('heading', { name: 'Häufige Fragen' })
    ).toBeInTheDocument();
  });

  it('keeps format names untranslated', () => {
    renderPage();
    expect(screen.getByText('Markdown')).toBeInTheDocument();
    expect(screen.getByText('.apkg')).toBeInTheDocument();
  });
});
