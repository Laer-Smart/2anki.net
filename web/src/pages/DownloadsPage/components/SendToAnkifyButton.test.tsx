import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import SendToAnkifyButton from './SendToAnkifyButton';

const navigateMock = vi.fn();
const dispatchMock = vi.fn();
const listClientsMock = vi.fn();
const trackMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('../../../lib/analytics/track', () => ({
  track: (...args: unknown[]) => trackMock(...args),
}));

vi.mock('../../../lib/backend/get2ankiApi', () => ({
  get2ankiApi: () => ({
    dispatchUploadToAnkify: (...args: unknown[]) => dispatchMock(...args),
    listAnkifyClients: () => listClientsMock(),
  }),
}));

let mockLocalsData: { locals: { patreon: boolean }; autoSyncActive: boolean } | undefined;

vi.mock('../../../lib/hooks/useUserLocals', () => ({
  useUserLocals: () => ({ data: mockLocalsData }),
}));

const renderButton = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <SendToAnkifyButton uploadId={42} filename="Pharmacology.apkg" />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('SendToAnkifyButton', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    dispatchMock.mockReset();
    listClientsMock.mockReset();
    trackMock.mockReset();
    listClientsMock.mockResolvedValue([{ status: 'active' }]);
    dispatchMock.mockResolvedValue({ created: 1, updated: 0, anki_web_sync: 'synced' });
  });

  afterEach(() => {
    mockLocalsData = undefined;
  });

  it('renders nothing for non-Ankify users', () => {
    mockLocalsData = { locals: { patreon: false }, autoSyncActive: false };
    const { container } = renderButton();
    expect(container.firstChild).toBeNull();
    expect(listClientsMock).not.toHaveBeenCalled();
  });

  it('dispatches the upload for lifetime (patreon) users', async () => {
    mockLocalsData = { locals: { patreon: true }, autoSyncActive: false };
    renderButton();
    const button = await screen.findByRole('button', { name: /send this to my anki/i });
    await waitFor(() => expect(button).not.toBeDisabled());
    fireEvent.click(button);
    await waitFor(() => expect(dispatchMock).toHaveBeenCalledWith(42));
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('dispatches the upload for Auto Sync subscribers', async () => {
    mockLocalsData = { locals: { patreon: false }, autoSyncActive: true };
    renderButton();
    const button = await screen.findByRole('button', { name: /send this to my anki/i });
    await waitFor(() => expect(button).not.toBeDisabled());
    fireEvent.click(button);
    await waitFor(() => expect(dispatchMock).toHaveBeenCalledWith(42));
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
