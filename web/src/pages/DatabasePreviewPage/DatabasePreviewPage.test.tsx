import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import DatabasePreviewPage from './DatabasePreviewPage';
import type { DatabasePreviewResponse } from '../../lib/backend/Backend';

const mockGetDatabasePreview = vi.fn();
const mockConvert = vi.fn();
const mockNavigate = vi.fn();
const mockTrack = vi.fn();

vi.mock('../../lib/backend/get2ankiApi', () => ({
  get2ankiApi: () => ({
    getDatabasePreview: mockGetDatabasePreview,
    convert: mockConvert,
  }),
}));

vi.mock('../../lib/analytics/track', () => ({
  track: (...args: unknown[]) => mockTrack(...args),
}));

vi.mock('react-router-dom', async () => {
  const real =
    await vi.importActual<typeof import('react-router-dom')>(
      'react-router-dom'
    );
  return { ...real, useNavigate: () => mockNavigate };
});

const baseResponse: DatabasePreviewResponse = {
  title: 'Vocabulary',
  url: 'https://notion.so/abc',
  columns: ['Word', 'Definition', 'Tags'],
  mapping: { frontField: 'Word', backField: 'Definition', ambiguous: false },
  samples: [
    {
      id: 'row-1',
      values: {
        Word: 'Osmosis',
        Definition: 'Movement of water across a membrane',
        Tags: 'Biology',
      },
    },
    {
      id: 'row-2',
      values: { Word: 'Mitosis', Definition: 'Cell division', Tags: 'Biology' },
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

beforeEach(() => {
  mockGetDatabasePreview.mockReset();
  mockConvert.mockReset();
  mockNavigate.mockReset();
  mockTrack.mockReset();
});

describe('DatabasePreviewPage', () => {
  it('shows the loading copy while fetching', () => {
    mockGetDatabasePreview.mockImplementation(
      () => new Promise(() => undefined)
    );
    renderPage();
    expect(screen.getByText('Reading your database')).toBeInTheDocument();
  });

  it('renders the table, stats line, dot badges and sample framing', async () => {
    mockGetDatabasePreview.mockResolvedValue(baseResponse);
    renderPage();

    await screen.findByRole('heading', { name: 'Vocabulary' });

    expect(
      screen.getByText(
        (_, node) =>
          node?.textContent ===
          '2+ rows · 3 columns · Front: Word · Back: Definition'
      )
    ).toBeInTheDocument();

    expect(screen.getByText('Osmosis')).toBeInTheDocument();
    expect(
      screen.getByText('Movement of water across a membrane')
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        'Preview of the first 2 rows. Converting to Anki includes every row in this database.'
      )
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        'Showing 2 rows here. Every row in this database is included when you convert.'
      )
    ).toBeInTheDocument();

    const wordHeader = screen.getByRole('columnheader', { name: /Word/ });
    expect(wordHeader.textContent).toContain('●');

    expect(mockTrack).toHaveBeenCalledWith(
      'database_preview_viewed',
      expect.any(Object)
    );
  });

  it('omits the sample framing when every row already fits in the preview', async () => {
    mockGetDatabasePreview.mockResolvedValue({
      ...baseResponse,
      hasMore: false,
    });
    renderPage();

    await screen.findByRole('heading', { name: 'Vocabulary' });

    expect(screen.queryByText(/Preview of the first/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Every row in this database/i)
    ).not.toBeInTheDocument();
  });

  it('shows the ambiguous-mapping warning when inference fails', async () => {
    mockGetDatabasePreview.mockResolvedValue({
      ...baseResponse,
      mapping: { frontField: null, backField: null, ambiguous: true },
    });
    renderPage();

    await screen.findByRole('heading', { name: 'Vocabulary' });
    expect(screen.getByText('Column mapping needed')).toBeInTheDocument();
  });

  it('shows the empty-database state', async () => {
    mockGetDatabasePreview.mockResolvedValue({
      title: 'Empty DB',
      url: null,
      columns: [],
      mapping: { frontField: null, backField: null, ambiguous: true },
      samples: [],
      rowCount: 0,
      hasMore: false,
    });
    renderPage();

    await screen.findByRole('heading', { name: 'Empty DB' });
    expect(
      screen.getByText('This database has no rows yet.')
    ).toBeInTheDocument();
  });

  it('shows the not-available state on 404', async () => {
    mockGetDatabasePreview.mockRejectedValue(
      new Error('Failed: 404 not found')
    );
    renderPage();

    const notice = await screen.findByText(/no longer available/i);
    expect(notice).toBeInTheDocument();
  });

  it('fires convert_clicked_from_preview and navigates to /downloads on 202', async () => {
    mockGetDatabasePreview.mockResolvedValue(baseResponse);
    mockConvert.mockResolvedValue({ status: 202, json: async () => ({}) });
    renderPage();

    await screen.findByRole('heading', { name: 'Vocabulary' });
    fireEvent.click(screen.getByRole('button', { name: 'Convert to Anki' }));

    await waitFor(() => {
      expect(mockConvert).toHaveBeenCalledWith(
        'db-abc',
        'database',
        'Vocabulary'
      );
    });
    expect(mockTrack).toHaveBeenCalledWith(
      'convert_clicked_from_preview',
      expect.any(Object)
    );
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/downloads');
    });
  });
});
