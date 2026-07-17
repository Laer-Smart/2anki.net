import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, test, vi, beforeEach } from 'vitest';
import { HelmetProvider } from 'react-helmet-async';
import DevelopersPage from './DevelopersPage';

const useUserLocals = vi.fn();
vi.mock('../../lib/hooks/useUserLocals', () => ({
  useUserLocals: () => useUserLocals(),
}));

const listApiKeys = vi.fn();
const requestDeveloperAccess = vi.fn();
vi.mock('../../lib/backend/developerKeys', () => ({
  listApiKeys: () => listApiKeys(),
  requestDeveloperAccess: () => requestDeveloperAccess(),
  createApiKey: vi.fn(),
  revokeApiKey: vi.fn(),
}));

function renderPage() {
  render(
    <HelmetProvider>
      <DevelopersPage />
    </HelmetProvider>
  );
}

describe('DevelopersPage', () => {
  beforeEach(() => {
    useUserLocals.mockReset();
    listApiKeys.mockReset();
    requestDeveloperAccess.mockReset();
    listApiKeys.mockResolvedValue([]);
  });

  test('shows the key manager for a lifetime account', async () => {
    useUserLocals.mockReturnValue({
      data: { locals: { patreon: true } },
      isLoading: false,
    });
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('API keys')).toBeInTheDocument()
    );
    expect(screen.getByText('Create key')).toBeInTheDocument();
    expect(screen.getByText('Full API docs')).toHaveAttribute(
      'href',
      '/api/docs'
    );
    expect(screen.getByText('Download the CLI')).toBeInTheDocument();
    expect(screen.getByText('Convert a file into a deck')).toBeInTheDocument();
  });

  test('shows the key manager for a granted developer_access account', async () => {
    useUserLocals.mockReturnValue({
      data: { locals: { patreon: false, developer_access: true } },
      isLoading: false,
    });
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('API keys')).toBeInTheDocument()
    );
  });

  test('shows the locked request-access state for a non-access account', () => {
    useUserLocals.mockReturnValue({
      data: { locals: { patreon: false, developer_access: false } },
      isLoading: false,
    });
    renderPage();
    expect(screen.getByText('Request access')).toBeInTheDocument();
    expect(screen.queryByText('Create key')).not.toBeInTheDocument();
  });
});
