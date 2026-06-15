import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import StatusPage from './StatusPage';

const mockStatus = {
  api: { ok: true },
  db: { ok: true },
  notion: { ok: false, lastSuccessAt: null },
  stripe: { lastWebhookAt: null },
  lastDeploy: { sha: null, time: null },
  incidents: [],
};

function setupFetch(payload: unknown, ok = true) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok,
    json: () => Promise.resolve(payload),
  } as Response);
}

describe('StatusPage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows "Checking services" while loading', () => {
    globalThis.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    render(
      <MemoryRouter>
        <StatusPage />
      </MemoryRouter>
    );
    expect(screen.getByText(/checking services/i)).toBeInTheDocument();
  });

  it('renders all four service rows on success', async () => {
    setupFetch(mockStatus);
    render(
      <MemoryRouter>
        <StatusPage />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('API')).toBeInTheDocument();
      expect(screen.getByText('Database')).toBeInTheDocument();
      expect(screen.getByText('Notion API')).toBeInTheDocument();
      expect(screen.getByText('Stripe webhooks')).toBeInTheDocument();
    });
  });

  it('shows API-unreachable fallback when fetch rejects', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('network'));
    render(
      <MemoryRouter>
        <StatusPage />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText(/API unreachable/i)).toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: /r\/notion2anki/i })
      ).toBeInTheDocument();
    });
  });

  it('shows incidents when present', async () => {
    const withIncident = {
      ...mockStatus,
      incidents: [
        {
          id: '1',
          start: '2026-05-29T10:00:00Z',
          end: '2026-05-29T11:00:00Z',
          summary: 'Conversion service degraded',
        },
      ],
    };
    setupFetch(withIncident);
    render(
      <MemoryRouter>
        <StatusPage />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(
        screen.getByText('Conversion service degraded')
      ).toBeInTheDocument();
    });
  });

  it('marks ongoing incidents clearly', async () => {
    const withOpenIncident = {
      ...mockStatus,
      incidents: [
        {
          id: '1',
          start: '2026-05-29T10:00:00Z',
          end: null,
          summary: 'Upload delays',
        },
      ],
    };
    setupFetch(withOpenIncident);
    render(
      <MemoryRouter>
        <StatusPage />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('ongoing')).toBeInTheDocument();
    });
  });

  it('renders the last deploy as a relative time, never a raw git SHA', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(
      new Date('2026-05-29T13:00:00Z').getTime()
    );
    const withDeploy = {
      ...mockStatus,
      lastDeploy: {
        sha: '693f569bc826abc0001122334455667788990011',
        time: '2026-05-29T11:00:00Z',
      },
    };
    setupFetch(withDeploy);
    render(
      <MemoryRouter>
        <StatusPage />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('2 hours ago')).toBeInTheDocument();
    });
    const body = document.body.textContent ?? '';
    expect(body).not.toMatch(/\b[0-9a-f]{7,40}\b/);
  });

  it('renders incident timestamps as relative time, not toLocaleString output', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(
      new Date('2026-05-29T13:00:00Z').getTime()
    );
    const withIncident = {
      ...mockStatus,
      incidents: [
        {
          id: '1',
          start: '2026-05-29T10:00:00Z',
          end: '2026-05-29T11:00:00Z',
          summary: 'Conversion service degraded',
        },
      ],
    };
    setupFetch(withIncident);
    render(
      <MemoryRouter>
        <StatusPage />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText(/Started 3 hours ago/)).toBeInTheDocument();
    });
    const body = document.body.textContent ?? '';
    const localeSample = new Date('2026-05-29T10:00:00Z').toLocaleString();
    expect(body).not.toContain(localeSample);
    expect(screen.getByText(/resolved 2 hours ago/)).toBeInTheDocument();
  });
});
