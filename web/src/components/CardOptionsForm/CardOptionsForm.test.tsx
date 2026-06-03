import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { CardOptionsForm } from './CardOptionsForm';
import CardOptionModel from '../../lib/data_layer/model/CardOption';

const mockResetUserCardOptions = vi.fn();
const mockGetSettingsCardOptions = vi.fn();
const mockUseUserLocals = vi.fn();

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

vi.mock('../../lib/hooks/useUserLocals', () => ({
  useUserLocals: () => mockUseUserLocals(),
}));

vi.mock('../../lib/backend/templates', () => ({
  getUserTemplates: vi.fn().mockResolvedValue({ templates: [], hiddenIds: [] }),
  getOfficialNoteTypes: vi.fn().mockResolvedValue([]),
  getDefaultNoteTypes: vi.fn().mockResolvedValue([]),
}));

function setUserLocalsPaying(paying: boolean) {
  mockUseUserLocals.mockReturnValue({
    data: paying
      ? { locals: { patreon: false, subscriber: true } }
      : { locals: { patreon: false, subscriber: false } },
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  });
}

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
    setUserLocalsPaying(false);
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
    setUserLocalsPaying(false);
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

describe('CardOptionsForm overlapping cloze picker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResetUserCardOptions.mockResolvedValue(undefined);
    setUserLocalsPaying(false);
    localStorage.clear();
    mockGetSettingsCardOptions.mockResolvedValue([
      new CardOptionModel(
        'cloze',
        'Cloze deletion cards',
        'Turn code spans into cloze deletions.',
        true
      ),
    ]);
  });

  it('writes the picked style to localStorage when cloze is on', async () => {
    renderForm(false, { onReset: vi.fn(), setError: vi.fn() });
    const showAll = await screen.findByRole('button', {
      name: 'Show the whole list',
    });
    expect(showAll).toBeEnabled();

    fireEvent.click(showAll);

    await waitFor(() => {
      expect(localStorage.getItem('overlapping-cloze')).toBe('show-all');
    });
    expect(showAll).toHaveAttribute('aria-pressed', 'true');
  });

  it('disables the picker when cloze is turned off', async () => {
    renderForm(false, { onReset: vi.fn(), setError: vi.fn() });
    const cloze = await screen.findByRole('checkbox', {
      name: 'Cloze deletion cards',
    });
    fireEvent.click(cloze);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Show nearby lines only' })
      ).toBeDisabled();
    });
    expect(
      screen.getByText('Turn on Cloze deletion cards first.')
    ).toBeInTheDocument();
  });

  it('hides the preview while the style is Off and shows it once a style is picked', async () => {
    renderForm(false, { onReset: vi.fn(), setError: vi.fn() });
    const showAll = await screen.findByRole('button', {
      name: 'Show the whole list',
    });
    expect(
      screen.queryByLabelText('Preview: each card hides one line of the list')
    ).toBeNull();

    fireEvent.click(showAll);

    await waitFor(() => {
      expect(
        screen.getByLabelText(
          'Preview: each card hides one line of the list'
        )
      ).toBeInTheDocument();
    });
  });
});

describe('CardOptionsForm manual TTS picker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResetUserCardOptions.mockResolvedValue(undefined);
    setUserLocalsPaying(false);
    localStorage.clear();
    mockGetSettingsCardOptions.mockResolvedValue([
      new CardOptionModel(
        'cloze',
        'Cloze deletion cards',
        'Turn code spans into cloze deletions.',
        true
      ),
    ]);
  });

  it('writes the picked language to localStorage and reveals the side selector', async () => {
    renderForm(false, { onReset: vi.fn(), setError: vi.fn() });
    const langSelect = await screen.findByLabelText('Language');

    expect(
      screen.queryByRole('group', { name: 'Read aloud side' })
    ).toBeNull();

    fireEvent.change(langSelect, { target: { value: 'ja_JP' } });

    await waitFor(() => {
      expect(localStorage.getItem('tts-manual-lang')).toBe('ja_JP');
    });
    expect(
      screen.getByRole('group', { name: 'Read aloud side' })
    ).toBeInTheDocument();
  });

  it('writes the picked side to localStorage', async () => {
    localStorage.setItem('tts-manual-lang', 'ja_JP');
    renderForm(false, { onReset: vi.fn(), setError: vi.fn() });
    const bothButton = await screen.findByRole('button', { name: 'Both' });

    fireEvent.click(bothButton);

    await waitFor(() => {
      expect(localStorage.getItem('tts-manual-side')).toBe('both');
    });
    expect(bothButton).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('CardOptionsForm ai-comprehensive toggle (paid-only)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResetUserCardOptions.mockResolvedValue(undefined);
    localStorage.clear();
    mockGetSettingsCardOptions.mockResolvedValue([
      new CardOptionModel(
        'ai-comprehensive',
        'Comprehensive AI mode',
        'Aim for hundreds of cards per chapter instead of dozens. Conversions take longer. Paid plans only.',
        false
      ),
    ]);
  });

  it('renders the toggle for a paying user', async () => {
    setUserLocalsPaying(true);
    renderForm(true, { onReset: vi.fn(), setError: vi.fn() });
    const toggle = await screen.findByRole('checkbox', {
      name: 'Comprehensive AI mode',
    });
    expect(toggle).not.toBeChecked();
  });

  it('hides the toggle for a non-paying user', async () => {
    setUserLocalsPaying(false);
    renderForm(true, { onReset: vi.fn(), setError: vi.fn() });
    await screen.findByRole('button', { name: 'Reset to defaults' });
    expect(
      screen.queryByRole('checkbox', { name: 'Comprehensive AI mode' })
    ).toBeNull();
  });

  it('round-trips the toggle value to localStorage for a paying user', async () => {
    setUserLocalsPaying(true);
    renderForm(true, { onReset: vi.fn(), setError: vi.fn() });
    const toggle = await screen.findByRole('checkbox', {
      name: 'Comprehensive AI mode',
    });
    expect(toggle).not.toBeChecked();

    fireEvent.click(toggle);

    await waitFor(() => {
      expect(localStorage.getItem('ai-comprehensive')).toBe('true');
    });
    expect(toggle).toBeChecked();
  });
});
