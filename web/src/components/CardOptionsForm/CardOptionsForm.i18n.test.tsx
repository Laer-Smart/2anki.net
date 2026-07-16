import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import i18n from '../../lib/i18n';
import { CardOptionsForm } from './CardOptionsForm';

const mockGetSettingsCardOptions = vi.fn();
const mockUseUserLocals = vi.fn();

vi.mock('../../lib/backend/get2ankiApi', () => ({
  get2ankiApi: () => ({
    resetUserCardOptions: vi.fn().mockResolvedValue(undefined),
    deleteSettings: vi.fn().mockResolvedValue(undefined),
    saveSettings: vi.fn().mockResolvedValue(undefined),
    getSettings: vi.fn().mockResolvedValue(null),
  }),
}));

vi.mock('../../lib/backend/getSettingsCardOptions', () => ({
  getSettingsCardOptions: () => mockGetSettingsCardOptions(),
}));

vi.mock('../../lib/hooks/useUserLocals', () => ({
  useUserLocals: () => mockUseUserLocals(),
}));

vi.mock('../../lib/backend/templates', () => ({
  getUserTemplates: vi.fn().mockResolvedValue({ templates: [], hiddenIds: [] }),
  getOfficialNoteTypes: vi.fn().mockResolvedValue([]),
  getDefaultNoteTypes: vi.fn().mockResolvedValue([]),
}));

function renderForm() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <CardOptionsForm pageId={null} isLoggedIn setError={vi.fn()} />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('CardOptionsForm in German', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockGetSettingsCardOptions.mockResolvedValue([]);
    mockUseUserLocals.mockReturnValue({
      data: { locals: { patreon: false, subscriber: false } },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    localStorage.clear();
    await i18n.changeLanguage('de');
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('translates section headings and the deck name field', async () => {
    renderForm();
    expect(await screen.findByText('Stapel & Struktur')).toBeInTheDocument();
    expect(screen.getByText('Stapelname')).toBeInTheDocument();
    expect(screen.getByText('Vorlagen')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('Stapelnamen eingeben (optional)')
    ).toBeInTheDocument();
  });
});
