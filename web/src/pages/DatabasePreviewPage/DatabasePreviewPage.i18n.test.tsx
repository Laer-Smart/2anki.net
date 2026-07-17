import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import i18n from '../../lib/i18n';
import DatabasePreviewPage from './DatabasePreviewPage';
import type { DatabasePreviewResponse } from '../../lib/backend/Backend';

const mockGetDatabasePreview = vi.fn();

vi.mock('../../lib/backend/get2ankiApi', () => ({
  get2ankiApi: () => ({
    getDatabasePreview: mockGetDatabasePreview,
    convert: vi.fn(),
  }),
}));

vi.mock('../../lib/analytics/track', () => ({
  track: vi.fn(),
}));

const baseResponse: DatabasePreviewResponse = {
  title: 'Vocabulary',
  url: 'https://notion.so/abc',
  columns: ['Word', 'Definition', 'Tags'],
  mapping: { frontField: 'Word', backField: 'Definition', ambiguous: false },
  samples: [
    {
      id: 'row-1',
      values: { Word: 'Osmosis', Definition: 'Osmose', Tags: 'Biology' },
    },
    {
      id: 'row-2',
      values: { Word: 'Mitosis', Definition: 'Mitose', Tags: 'Biology' },
    },
  ],
  rowCount: 2,
  hasMore: true,
};

function renderPage(id = 'db-abc') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/preview/database/${id}`]}>
        <Routes>
          <Route
            path="/preview/database/:id"
            element={<DatabasePreviewPage setError={vi.fn()} />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('DatabasePreviewPage in German', () => {
  beforeEach(async () => {
    mockGetDatabasePreview.mockReset();
    await i18n.changeLanguage('de');
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('renders the reading state in German', () => {
    mockGetDatabasePreview.mockImplementation(
      () => new Promise(() => undefined)
    );
    renderPage();
    expect(
      screen.getByText('Deine Datenbank wird gelesen')
    ).toBeInTheDocument();
  });

  it('renders German chrome, plurals, and keeps column names verbatim', async () => {
    mockGetDatabasePreview.mockResolvedValue(baseResponse);
    renderPage();

    await screen.findByRole('heading', { name: 'Vocabulary' });

    expect(
      screen.getByRole('button', { name: 'In Anki konvertieren' })
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        (_, node) =>
          node?.textContent ===
          '2+ Zeilen · 3 Spalten · Vorderseite: Word · Rückseite: Definition'
      )
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        'Vorschau der ersten 2 Zeilen. Beim Konvertieren nach Anki wird jede Zeile dieser Datenbank berücksichtigt.'
      )
    ).toBeInTheDocument();

    expect(screen.getByText('In Notion öffnen')).toBeInTheDocument();
  });
});
