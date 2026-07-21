import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

  test('shows the key manager to a free account — keys are self-service', async () => {
    useUserLocals.mockReturnValue({
      data: { locals: { patreon: false, developer_access: false } },
      isLoading: false,
    });
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('API keys')).toBeInTheDocument()
    );
    expect(screen.getByText('Create key')).toBeInTheDocument();
  });

  test('offers the MCP access request only to accounts without connector access', () => {
    useUserLocals.mockReturnValue({
      data: { locals: { patreon: false, developer_access: false } },
      isLoading: false,
    });
    renderPage();
    expect(screen.getByText('Request connector access')).toBeInTheDocument();
  });

  test('hides the MCP access request for lifetime accounts', () => {
    useUserLocals.mockReturnValue({
      data: { locals: { patreon: true } },
      isLoading: false,
    });
    renderPage();
    expect(
      screen.queryByText('Request connector access')
    ).not.toBeInTheDocument();
  });

  test('install strip and MCP card are visible without access', () => {
    useUserLocals.mockReturnValue({
      data: { locals: { patreon: false, developer_access: false } },
      isLoading: false,
    });
    renderPage();
    expect(screen.getByText('npx @2anki/cli login')).toBeInTheDocument();
    expect(screen.getAllByText('https://2anki.net/mcp').length).toBeGreaterThan(
      0
    );
    expect(screen.getByText('How to connect')).toHaveAttribute(
      'href',
      '/documentation/start-here/use-in-claude'
    );
  });

  test('switching the package manager tab swaps the install command', () => {
    useUserLocals.mockReturnValue({
      data: { locals: { patreon: true } },
      isLoading: false,
    });
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'pnpm' }));
    expect(screen.getByText('pnpm add -g @2anki/cli')).toBeInTheDocument();
    expect(screen.queryByText('npx @2anki/cli login')).not.toBeInTheDocument();
  });

  test('binary tab links to the GitHub releases page', () => {
    useUserLocals.mockReturnValue({
      data: { locals: { patreon: true } },
      isLoading: false,
    });
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'binary' }));
    expect(screen.getByText('Download the CLI')).toHaveAttribute(
      'href',
      'https://github.com/2anki/server/releases/latest'
    );
  });

  test('invites contact when a use case is not covered', () => {
    useUserLocals.mockReturnValue({
      data: { locals: { patreon: true } },
      isLoading: false,
    });
    renderPage();
    const mailLinks = screen.getAllByRole('link', {
      name: 'support@2anki.net',
    });
    expect(mailLinks[0]).toHaveAttribute('href', 'mailto:support@2anki.net');
    expect(
      screen.getByRole('link', { name: 'Open a GitHub issue' })
    ).toHaveAttribute('href', 'https://github.com/2anki/server/issues');
  });

  test('spec rail lists the API base and MCP server', () => {
    useUserLocals.mockReturnValue({
      data: { locals: { patreon: true } },
      isLoading: false,
    });
    renderPage();
    expect(screen.getByText('https://2anki.net/api')).toBeInTheDocument();
    expect(screen.getByLabelText('Connection facts')).toBeInTheDocument();
  });
});
