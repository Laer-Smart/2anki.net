import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import i18n from '../../lib/i18n';
import { HomePage } from './HomePage';

vi.mock('../../lib/analytics/track', () => ({
  track: vi.fn(),
}));

function renderHome() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <HomePage setErrorMessage={vi.fn()} isLoggedIn={false} />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('HomePage in German', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('de');
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('renders the hero headline in German', () => {
    renderHome();
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Karteikarten, die in Anki funktionieren',
      })
    ).toBeInTheDocument();
  });

  it('translates the AI badge and its create-account link', () => {
    renderHome();
    expect(
      screen.getByText(/Saubere Karten, bereit zum Lernen/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Konto erstellen' })
    ).toBeInTheDocument();
  });

  it('translates the card-options footer link', () => {
    renderHome();
    expect(
      screen.getByRole('link', { name: 'Kartenoptionen' })
    ).toBeInTheDocument();
  });

  it('translates the lower-half features heading', () => {
    renderHome();
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'Weitere Möglichkeiten, 2anki zu nutzen',
      })
    ).toBeInTheDocument();
  });

  it('translates the walkthroughs heading and show-all toggle', () => {
    renderHome();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Anleitungen' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '▾ Alle 10 Videos anzeigen' })
    ).toBeInTheDocument();
  });

  it('translates a feature card label and body', () => {
    renderHome();
    expect(screen.getByText('Notion zu Anki')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Wandle eine Notion-Seite in einen Stapel um — Toggles werden zu Karten.'
      )
    ).toBeInTheDocument();
  });
});
