import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { CardOptionsForm } from './CardOptionsForm';
import CardOption from '../../lib/data_layer/model/CardOption';
import { getSettingsCardOptions } from '../../lib/backend/getSettingsCardOptions';
import { getUserLocals } from '../../lib/backend/getUserLocals';

const mockResetUserCardOptions = vi.fn();

vi.mock('../../lib/backend/get2ankiApi', () => ({
  get2ankiApi: () => ({
    resetUserCardOptions: mockResetUserCardOptions,
    deleteSettings: vi.fn().mockResolvedValue(undefined),
    saveSettings: vi.fn().mockResolvedValue(undefined),
    getSettings: vi.fn().mockResolvedValue({}),
  }),
}));

vi.mock('../../lib/backend/getSettingsCardOptions', () => ({
  getSettingsCardOptions: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../lib/backend/templates', () => ({
  getUserTemplates: vi.fn().mockResolvedValue({ templates: [], hiddenIds: [] }),
  getOfficialNoteTypes: vi.fn().mockResolvedValue([]),
  getDefaultNoteTypes: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../lib/backend/getUserLocals', () => ({
  getUserLocals: vi.fn().mockResolvedValue({
    locals: { patreon: false, subscriber: false },
  }),
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

describe('CardOptionsForm premium upsell notice', () => {
  const aiOptionLabel = 'Generate flashcards with Claude AI';

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(getSettingsCardOptions).mockResolvedValue([
      new CardOption('claude-ai-flashcards', aiOptionLabel, 'Uses Claude.', false),
    ]);
  });

  it('shows the paid-plan notice when a non-paying user enables a premium option', async () => {
    vi.mocked(getUserLocals).mockResolvedValue({
      locals: { patreon: false, subscriber: false },
    } as Awaited<ReturnType<typeof getUserLocals>>);
    renderForm(true, { onReset: vi.fn(), setError: vi.fn() });

    const toggle = await screen.findByRole('checkbox', { name: aiOptionLabel });
    expect(
      screen.queryByRole('link', { name: 'Compare plans' })
    ).not.toBeInTheDocument();

    fireEvent.click(toggle);

    const link = await screen.findByRole('link', { name: 'Compare plans' });
    expect(link).toHaveAttribute('href', '/pricing');
  });

  it('hides the notice again when the premium option is disabled', async () => {
    vi.mocked(getUserLocals).mockResolvedValue({
      locals: { patreon: false, subscriber: false },
    } as Awaited<ReturnType<typeof getUserLocals>>);
    renderForm(true, { onReset: vi.fn(), setError: vi.fn() });

    const toggle = await screen.findByRole('checkbox', { name: aiOptionLabel });
    fireEvent.click(toggle);
    expect(
      await screen.findByRole('link', { name: 'Compare plans' })
    ).toBeInTheDocument();

    fireEvent.click(toggle);
    await waitFor(() => {
      expect(
        screen.queryByRole('link', { name: 'Compare plans' })
      ).not.toBeInTheDocument();
    });
  });

  it('does not show the notice for a paying user', async () => {
    vi.mocked(getUserLocals).mockResolvedValue({
      locals: { patreon: false, subscriber: true },
    } as Awaited<ReturnType<typeof getUserLocals>>);
    renderForm(true, { onReset: vi.fn(), setError: vi.fn() });

    const toggle = await screen.findByRole('checkbox', { name: aiOptionLabel });
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(toggle).toBeChecked();
    });
    expect(
      screen.queryByRole('link', { name: 'Compare plans' })
    ).not.toBeInTheDocument();
  });
});
