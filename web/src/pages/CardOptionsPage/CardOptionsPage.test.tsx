import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import CardOptionsPage from './CardOptionsPage';

vi.mock('../../lib/backend/get2ankiApi', () => ({
  get2ankiApi: () => mockApi,
}));

const cardOptionsFormProps = vi.fn();
vi.mock('../../components/CardOptionsForm/CardOptionsForm', () => ({
  CardOptionsForm: (props: Record<string, unknown>) => {
    cardOptionsFormProps(props);
    return <div data-testid="card-options-form" />;
  },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockApi = {
  listSettings: vi.fn(),
  deleteSettings: vi.fn(),
  deleteRules: vi.fn(),
  deleteAllUserSettings: vi.fn(),
};

function renderPage(search = '') {
  return render(
    <MemoryRouter initialEntries={[`/card-options${search}`]}>
      <CardOptionsPage setErrorMessage={vi.fn()} />
    </MemoryRouter>
  );
}

describe('CardOptionsPage per-page list', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cardOptionsFormProps.mockClear();
    mockNavigate.mockClear();
    mockApi.listSettings.mockResolvedValue({ items: [] });
    mockApi.deleteSettings.mockResolvedValue(undefined);
    mockApi.deleteRules.mockResolvedValue(undefined);
    mockApi.deleteAllUserSettings.mockResolvedValue(undefined);
  });

  it('hides the pages section on the default view when no pages have custom options', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('card-options-form')).toBeInTheDocument();
    });
    expect(screen.queryByText('Pages with custom settings')).not.toBeInTheDocument();
  });

  it('shows the pages section with empty state when arriving from /notion', async () => {
    renderPage('?returnTo=/notion');
    await waitFor(() => {
      expect(screen.getByText('Pages with custom settings')).toBeInTheDocument();
      expect(
        screen.getByText(/When you save options for a specific Notion page/i)
      ).toBeInTheDocument();
    });
  });

  it('shows the pages section when there are saved per-page items even without /notion referrer', async () => {
    mockApi.listSettings.mockResolvedValue({
      items: [{ pageId: 'abc-123', title: 'Page A', updatedAt: null }],
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Pages with custom settings')).toBeInTheDocument();
    });
  });

  it('omits the Notion-specific subtitle line when not coming from /notion', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('card-options-form')).toBeInTheDocument();
    });
    expect(
      screen.queryByText(/To adjust settings for a single Notion page/i)
    ).not.toBeInTheDocument();
  });

  it('includes the Notion-specific subtitle line when coming from /notion', async () => {
    renderPage('?returnTo=/notion');
    await waitFor(() => {
      expect(
        screen.getByText(/To adjust settings for a single Notion page/i)
      ).toBeInTheDocument();
    });
  });

  it('renders a row for each saved per-page override linking to rules page', async () => {
    mockApi.listSettings.mockResolvedValue({
      items: [
        { pageId: 'abc-123', title: null, updatedAt: '2026-01-15T10:00:00.000Z' },
        { pageId: 'def-456', title: null, updatedAt: null },
      ],
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /abc-123/i })).toHaveAttribute(
        'href',
        '/rules/abc-123?returnTo=/card-options'
      );
      expect(screen.getByRole('link', { name: /def-456/i })).toHaveAttribute(
        'href',
        '/rules/def-456?returnTo=/card-options'
      );
    });
  });

  it('does not render the pages section when viewing a specific page', async () => {
    mockApi.listSettings.mockResolvedValue({
      items: [{ pageId: 'abc-123', title: null, updatedAt: null }],
    });
    renderPage('?pageId=abc-123');
    await waitFor(() => {
      expect(screen.queryByText('Pages with custom settings')).not.toBeInTheDocument();
    });
  });

  it('renders a Reset button for each saved page row', async () => {
    mockApi.listSettings.mockResolvedValue({
      items: [
        { pageId: 'abc-123', title: 'Organic Chemistry', updatedAt: '2026-01-15T10:00:00.000Z' },
      ],
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Reset Organic Chemistry to defaults/i })).toBeInTheDocument();
    });
  });

  it('removes the row from the list after a successful row reset', async () => {
    mockApi.listSettings.mockResolvedValue({
      items: [
        { pageId: 'abc-123', title: 'Organic Chemistry', updatedAt: '2026-01-15T10:00:00.000Z' },
      ],
    });
    renderPage();
    const resetButton = await screen.findByRole('button', { name: /Reset Organic Chemistry to defaults/i });
    fireEvent.click(resetButton);
    await waitFor(() => {
      expect(screen.queryByText('Organic Chemistry')).not.toBeInTheDocument();
    });
  });

  it('shows error strip when row reset fails', async () => {
    mockApi.deleteSettings.mockRejectedValue(new Error('network'));
    mockApi.listSettings.mockResolvedValue({
      items: [
        { pageId: 'abc-123', title: 'Page A', updatedAt: null },
      ],
    });
    renderPage();
    const resetButton = await screen.findByRole('button', { name: /Reset Page A to defaults/i });
    fireEvent.click(resetButton);
    await waitFor(() => {
      expect(screen.getByText("Couldn't reset. Try again.")).toBeInTheDocument();
    });
  });

  it('hides bulk reset button when list is empty', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Reset all to defaults/i })).not.toBeInTheDocument();
    });
  });

  it('shows bulk reset button when list has items', async () => {
    mockApi.listSettings.mockResolvedValue({
      items: [
        { pageId: 'abc-123', title: 'Page A', updatedAt: null },
        { pageId: 'def-456', title: 'Page B', updatedAt: null },
      ],
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Reset all to defaults/i })).toBeInTheDocument();
    });
  });

  it('opens confirm dialog with count on bulk reset click', async () => {
    mockApi.listSettings.mockResolvedValue({
      items: [
        { pageId: 'abc-123', title: 'Page A', updatedAt: null },
        { pageId: 'def-456', title: 'Page B', updatedAt: null },
      ],
    });
    renderPage();
    const bulkButton = await screen.findByRole('button', { name: /Reset all to defaults/i });
    fireEvent.click(bulkButton);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Reset 2 pages' })).toBeInTheDocument();
    });
  });

  it('calls deleteAllUserSettings and refreshes list on bulk confirm', async () => {
    mockApi.listSettings
      .mockResolvedValueOnce({
        items: [{ pageId: 'abc-123', title: 'Page A', updatedAt: null }],
      })
      .mockResolvedValueOnce({ items: [] });

    renderPage();
    const bulkButton = await screen.findByRole('button', { name: /Reset all to defaults/i });
    fireEvent.click(bulkButton);
    const confirmButton = await screen.findByRole('button', { name: 'Reset 1 page' });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockApi.deleteAllUserSettings).toHaveBeenCalledTimes(1);
      expect(mockApi.listSettings).toHaveBeenCalledTimes(2);
    });
  });

  it('wires onSaved to return to /upload when arriving with ?returnTo=/upload', async () => {
    renderPage('?returnTo=/upload');
    await screen.findByTestId('card-options-form');
    const props = cardOptionsFormProps.mock.calls.at(-1)?.[0] as { onSaved?: () => void };
    expect(props.onSaved).toBeDefined();
    props.onSaved!();
    expect(mockNavigate).toHaveBeenCalledWith('/upload');
  });

  it('leaves onSaved undefined for direct nav to /card-options', async () => {
    renderPage();
    await screen.findByTestId('card-options-form');
    const props = cardOptionsFormProps.mock.calls.at(-1)?.[0] as { onSaved?: () => void };
    expect(props.onSaved).toBeUndefined();
  });

  it('keeps onSaved wired when viewing a specific page', async () => {
    renderPage('?pageId=abc-123');
    await screen.findByTestId('card-options-form');
    const props = cardOptionsFormProps.mock.calls.at(-1)?.[0] as { onSaved?: () => void };
    expect(props.onSaved).toBeDefined();
    props.onSaved!();
    expect(mockNavigate).toHaveBeenCalledWith('/upload');
  });

  it('shows error strip when bulk reset fails', async () => {
    mockApi.deleteAllUserSettings.mockRejectedValue(new Error('server error'));
    mockApi.listSettings.mockResolvedValue({
      items: [{ pageId: 'abc-123', title: 'Page A', updatedAt: null }],
    });
    renderPage();
    const bulkButton = await screen.findByRole('button', { name: /Reset all to defaults/i });
    fireEvent.click(bulkButton);
    const confirmButton = await screen.findByRole('button', { name: 'Reset 1 page' });
    fireEvent.click(confirmButton);
    await waitFor(() => {
      expect(
        screen.getByText("Couldn't reset all pages. Some may have been reset — refresh to check.")
      ).toBeInTheDocument();
    });
  });
});
