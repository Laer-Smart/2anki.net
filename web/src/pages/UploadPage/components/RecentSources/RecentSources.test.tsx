import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

import { RecentSources } from './RecentSources';
import type { RecentSource } from './getRecentSources';

const trackMock = vi.fn();
vi.mock('../../../../lib/analytics/track', () => ({
  track: (...args: unknown[]) => trackMock(...args),
}));

const getRecentSourcesMock = vi.fn();
vi.mock('./getRecentSources', () => ({
  getRecentSources: () => getRecentSourcesMock(),
}));

function renderRecentSources() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <RecentSources />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

function source(overrides: Partial<RecentSource>): RecentSource {
  return {
    id: 'page-1',
    title: 'Organic Chemistry',
    type: 'notion',
    updatedAt: new Date().toISOString(),
    convertUrl: '/preview/page-1',
    ...overrides,
  };
}

describe('RecentSources', () => {
  beforeEach(() => {
    trackMock.mockReset();
    getRecentSourcesMock.mockReset();
  });

  it('renders nothing when there are no recent sources', async () => {
    getRecentSourcesMock.mockResolvedValue([]);

    const { container } = renderRecentSources();

    await waitFor(() => expect(getRecentSourcesMock).toHaveBeenCalled());
    expect(container.querySelector('section')).toBeNull();
  });

  it('renders one Convert again link per source', async () => {
    getRecentSourcesMock.mockResolvedValue([
      source({ id: 'a', title: 'Anatomy', convertUrl: '/preview/a' }),
      source({ id: 'b', title: 'Biochem', convertUrl: '/preview/b' }),
      source({ id: 'c', title: 'Cardiology', convertUrl: '/preview/c' }),
    ]);

    renderRecentSources();

    const links = await screen.findAllByRole('link', { name: 'Convert again' });
    expect(links).toHaveLength(3);
    expect(screen.getByText('Anatomy')).toBeInTheDocument();
    expect(links[0]).toHaveAttribute('href', '/preview/a');
  });

  it('fires recent_page_reconvert_clicked with the source type on click', async () => {
    getRecentSourcesMock.mockResolvedValue([
      source({ id: 'a', type: 'remote_upload', convertUrl: '/preview/apkg/a' }),
    ]);

    renderRecentSources();

    const link = await screen.findByRole('link', { name: 'Convert again' });
    fireEvent.click(link);

    expect(trackMock).toHaveBeenCalledWith('recent_page_reconvert_clicked', {
      type: 'remote_upload',
    });
  });
});
