import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';

import { TransformPage } from './TransformPage';
import { useUserLocals } from '../../lib/hooks/useUserLocals';

vi.mock('../../lib/hooks/useUserLocals', () => ({
  useUserLocals: vi.fn(),
}));

vi.mock('../../lib/analytics/track', () => ({
  track: vi.fn(),
}));

const mockUseUserLocals = useUserLocals as unknown as ReturnType<typeof vi.fn>;

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <TransformPage />
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

describe('TransformPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('asks the user to sign in when they are anonymous', () => {
    mockUseUserLocals.mockReturnValue({ data: { user: null, locals: {} } });
    renderPage();
    expect(
      screen.getByText(/create an account/i)
    ).toBeInTheDocument();
  });

  it('shows the paywall to a free signed-in user', () => {
    mockUseUserLocals.mockReturnValue({
      data: {
        user: { id: 1 },
        locals: { patreon: false, subscriber: false },
      },
    });
    renderPage();
    expect(
      screen.getByText(/Transform is on the paid plan/i)
    ).toBeInTheDocument();
  });

  it('renders the upload form for a paid user', () => {
    mockUseUserLocals.mockReturnValue({
      data: {
        user: { id: 1 },
        locals: { patreon: false, subscriber: true },
      },
    });
    renderPage();
    expect(
      screen.getByText(/Drop a .apkg or click to pick a file/i)
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Transform$/i })).toBeInTheDocument();
  });

  it('shows the language selector when translate_back is picked', () => {
    mockUseUserLocals.mockReturnValue({
      data: {
        user: { id: 1 },
        locals: { patreon: true, subscriber: false },
      },
    });
    renderPage();
    const radios = screen.getAllByRole('radio');
    const translateRadio = radios.find(
      (r) => (r as HTMLInputElement).value === 'translate_back'
    );
    expect(translateRadio).toBeDefined();
    fireEvent.click(translateRadio!);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('disables the submit button until a file is picked', () => {
    mockUseUserLocals.mockReturnValue({
      data: {
        user: { id: 1 },
        locals: { patreon: true, subscriber: false },
      },
    });
    renderPage();
    const button = screen.getByRole('button', { name: /^Transform$/i });
    expect(button).toBeDisabled();
  });

  it('rejects a non-apkg file', async () => {
    mockUseUserLocals.mockReturnValue({
      data: {
        user: { id: 1 },
        locals: { patreon: true, subscriber: false },
      },
    });
    renderPage();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const wrongFile = new File(['hello'], 'notes.html', { type: 'text/html' });
    fireEvent.change(input, { target: { files: [wrongFile] } });
    await waitFor(() => {
      expect(screen.getByText(/Pick a .apkg file/i)).toBeInTheDocument();
    });
  });
});
