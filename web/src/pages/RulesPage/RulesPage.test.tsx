import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import RulesPage from './RulesPage';

vi.mock('../../lib/backend/get2ankiApi', () => ({
  get2ankiApi: () => mockApi,
}));

vi.mock('../../components/CardOptionsForm/CardOptionsForm', () => ({
  CardOptionsForm: vi.fn((_props: unknown, _ref: unknown) => (
    <div data-testid="card-options-form" />
  )),
}));

const mockApi = {
  getRules: vi.fn(),
  getFavorites: vi.fn(),
  deleteRules: vi.fn(),
  deleteSettings: vi.fn(),
  addFavorite: vi.fn(),
  deleteFavorite: vi.fn(),
  saveRules: vi.fn(),
};

function renderPage(id = 'page-abc') {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[`/rules/${id}`]}>
        <Routes>
          <Route
            path="/rules/:id"
            element={<RulesPage setErrorMessage={vi.fn()} />}
          />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>
  );
}

describe('RulesPage meta', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.getRules.mockResolvedValue(null);
    mockApi.getFavorites.mockResolvedValue([]);
  });

  it('renders a noindex meta tag so bots do not index the parser-rules editor', () => {
    renderPage();
    const meta = document.querySelector('meta[name="robots"]');
    expect(meta).not.toBeNull();
    expect(meta?.getAttribute('content')).toBe('noindex, nofollow');
  });
});

describe('RulesPage reset', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.getRules.mockResolvedValue(null);
    mockApi.getFavorites.mockResolvedValue([]);
    mockApi.deleteRules.mockResolvedValue(undefined);
    mockApi.deleteSettings.mockResolvedValue(undefined);
  });

  it('shows the Reset to defaults button', async () => {
    renderPage();
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Reset to defaults' })
      ).toBeInTheDocument();
    });
  });

  it('calls deleteRules and deleteSettings when Reset to defaults is clicked', async () => {
    renderPage('page-xyz');
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Reset to defaults' })
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Reset to defaults' }));

    await waitFor(() => {
      expect(mockApi.deleteRules).toHaveBeenCalledWith('page-xyz');
      expect(mockApi.deleteSettings).toHaveBeenCalledWith('page-xyz');
    });
  });
});

describe('RulesPage deck boundaries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.getRules.mockResolvedValue(null);
    mockApi.getFavorites.mockResolvedValue([]);
    mockApi.saveRules.mockResolvedValue(undefined);
  });

  it('renders a Deck boundaries label so users can configure which blocks start a deck', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Deck boundaries')).toBeInTheDocument();
    });
  });

  it('persists the deck-types selection when the user clicks Save changes', async () => {
    renderPage('page-deck-select');
    await waitFor(() => {
      expect(screen.getByText('Deck boundaries')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'database' }));

    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(mockApi.saveRules).toHaveBeenCalled();
    });
    const call = mockApi.saveRules.mock.calls[0];
    expect(call[0]).toBe('page-deck-select');
    expect(call[2]).toEqual(['page']);
  });

  it('falls back to the defaults when the user has deselected every deck type', async () => {
    renderPage('page-deck-empty');
    await waitFor(() => {
      expect(screen.getByText('Deck boundaries')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'page' }));
    fireEvent.click(screen.getByRole('button', { name: 'database' }));

    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(mockApi.saveRules).toHaveBeenCalled();
    });
    const call = mockApi.saveRules.mock.calls[0];
    expect(call[2]).toEqual(['page', 'database']);
  });

  it('loads the saved deck-types from a stored rule', async () => {
    mockApi.getRules.mockResolvedValue({
      id: 1,
      object_id: 'page-loaded',
      flashcard_is: 'toggle',
      sub_deck_is: 'child_page',
      tags_is: 'strikethrough',
      deck_is: 'database',
      owner: 1,
      email_notification: false,
    });
    renderPage('page-loaded');
    await waitFor(() => {
      expect(screen.getByText('Deck boundaries')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => {
      expect(mockApi.saveRules).toHaveBeenCalled();
    });
    const call = mockApi.saveRules.mock.calls[0];
    expect(call[2]).toEqual(['database']);
  });
});
