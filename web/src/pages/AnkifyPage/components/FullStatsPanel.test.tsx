import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import FullStatsPanel from './FullStatsPanel';
import { Backend } from '../../../lib/backend/Backend';
import { track } from '../../../lib/analytics/track';

vi.mock('../../../lib/analytics/track', () => ({
  track: vi.fn(),
}));

const makeBackend = (overrides: Partial<Backend> = {}): Backend =>
  ({
    getAnkifyCollectionStatsHtml: vi.fn(async () => ({
      html: '<p>stats</p>',
      truncated: false,
    })),
    ...overrides,
  }) as unknown as Backend;

const renderPanel = (backend: Backend) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <FullStatsPanel backend={backend} />
    </QueryClientProvider>
  );
};

const openPanel = () => {
  const details = screen
    .getByText('Full stats')
    .closest('details') as HTMLDetailsElement;
  details.open = true;
  fireEvent(details, new Event('toggle', { bubbles: false }));
  return details;
};

describe('FullStatsPanel', () => {
  beforeEach(() => {
    vi.mocked(track).mockClear();
  });

  test('does not fetch until opened', () => {
    const fetchStats = vi.fn(async () => ({
      html: '<p>stats</p>',
      truncated: false,
    }));
    renderPanel(makeBackend({ getAnkifyCollectionStatsHtml: fetchStats }));

    expect(fetchStats).not.toHaveBeenCalled();
  });

  test('renders the stats in a sandboxed iframe and fires the event when opened', async () => {
    renderPanel(makeBackend());

    openPanel();

    expect(track).toHaveBeenCalledWith('ankify_view_full_stats');

    const frame = (await screen.findByTitle(
      'Anki collection stats'
    )) as HTMLIFrameElement;
    expect(frame.getAttribute('sandbox')).toBe('allow-scripts');
    expect(frame.getAttribute('srcdoc')).toContain('<p>stats</p>');
  });

  test('shows the truncation notice when the report is capped', async () => {
    renderPanel(
      makeBackend({
        getAnkifyCollectionStatsHtml: vi.fn(async () => ({
          html: '<p>stats</p>',
          truncated: true,
        })),
      })
    );

    openPanel();

    expect(
      await screen.findByText(/showing the first part of your stats/i)
    ).toBeInTheDocument();
  });

  test('degrades calmly when Anki returns no stats', async () => {
    renderPanel(
      makeBackend({
        getAnkifyCollectionStatsHtml: vi.fn(async () => ({
          html: null,
          truncated: false,
        })),
      })
    );

    openPanel();

    expect(
      await screen.findByText(/stats load once anki is running/i)
    ).toBeInTheDocument();
  });
});
