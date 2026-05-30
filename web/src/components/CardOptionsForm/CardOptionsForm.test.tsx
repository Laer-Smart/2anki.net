import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { CardOptionsForm } from './CardOptionsForm';
import CardOptionModel from '../../lib/data_layer/model/CardOption';

const mockResetUserCardOptions = vi.fn();
const mockGetSettingsCardOptions = vi.fn();

vi.mock('../../lib/backend/get2ankiApi', () => ({
  get2ankiApi: () => ({
    resetUserCardOptions: mockResetUserCardOptions,
    deleteSettings: vi.fn().mockResolvedValue(undefined),
    saveSettings: vi.fn().mockResolvedValue(undefined),
    getSettings: vi.fn().mockResolvedValue({}),
  }),
}));

vi.mock('../../lib/backend/getSettingsCardOptions', () => ({
  getSettingsCardOptions: () => mockGetSettingsCardOptions(),
}));

vi.mock('../../lib/backend/templates', () => ({
  getUserTemplates: vi.fn().mockResolvedValue({ templates: [], hiddenIds: [] }),
  getOfficialNoteTypes: vi.fn().mockResolvedValue([]),
  getDefaultNoteTypes: vi.fn().mockResolvedValue([]),
}));

function renderForm(
  isLoggedIn: boolean,
  spies: { onReset: () => void; setError: () => void }
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <CardOptionsForm
          pageId={null}
          isLoggedIn={isLoggedIn}
          onReset={spies.onReset}
          setError={spies.setError}
        />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('CardOptionsForm reset for the account-default view', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResetUserCardOptions.mockResolvedValue(undefined);
    mockGetSettingsCardOptions.mockResolvedValue([]);
    localStorage.clear();
  });

  it('resets anonymous users without calling the auth-only server endpoint', async () => {
    const onReset = vi.fn();
    const setError = vi.fn();
    renderForm(false, { onReset, setError });
    const resetButton = await screen.findByRole('button', {
      name: 'Reset to defaults',
    });
    fireEvent.click(resetButton);
    await waitFor(() => {
      expect(onReset).toHaveBeenCalledTimes(1);
    });
    expect(mockResetUserCardOptions).not.toHaveBeenCalled();
    expect(setError).not.toHaveBeenCalled();
  });

  it('calls the server reset for logged-in users', async () => {
    const onReset = vi.fn();
    const setError = vi.fn();
    renderForm(true, { onReset, setError });
    const resetButton = await screen.findByRole('button', {
      name: 'Reset to defaults',
    });
    fireEvent.click(resetButton);
    await waitFor(() => {
      expect(mockResetUserCardOptions).toHaveBeenCalledTimes(1);
    });
    expect(setError).not.toHaveBeenCalled();
  });
});

describe('CardOptionsForm embed-images toggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResetUserCardOptions.mockResolvedValue(undefined);
    localStorage.clear();
    mockGetSettingsCardOptions.mockResolvedValue([
      new CardOptionModel(
        'embed-images',
        'Embed images in cards',
        'Pack image bytes into the deck so cards render offline.',
        true
      ),
    ]);
  });

  it('renders the toggle on by default and writes "false" to localStorage when unticked', async () => {
    renderForm(false, { onReset: vi.fn(), setError: vi.fn() });
    const toggle = await screen.findByRole('checkbox', {
      name: 'Embed images in cards',
    });
    expect(toggle).toBeChecked();

    fireEvent.click(toggle);

    await waitFor(() => {
      expect(localStorage.getItem('embed-images')).toBe('false');
    });
    expect(toggle).not.toBeChecked();
  });

  it('flipping back to on writes "true" to localStorage', async () => {
    localStorage.setItem('embed-images', 'false');
    renderForm(false, { onReset: vi.fn(), setError: vi.fn() });
    const toggle = await screen.findByRole('checkbox', {
      name: 'Embed images in cards',
    });
    expect(toggle).not.toBeChecked();

    fireEvent.click(toggle);

    await waitFor(() => {
      expect(localStorage.getItem('embed-images')).toBe('true');
    });
    expect(toggle).toBeChecked();
  });
});
