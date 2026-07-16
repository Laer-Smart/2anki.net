import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import i18n from '../../lib/i18n';
import StatusPage from './StatusPage';

const mockStatus = {
  api: { ok: true },
  db: { ok: true },
  notion: { ok: false, lastSuccessAt: null },
  stripe: { lastWebhookAt: null },
  lastDeploy: { sha: null, time: null },
  incidents: [],
};

describe('StatusPage in German', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('de');
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockStatus),
    } as Response);
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
    vi.restoreAllMocks();
  });

  it('renders the services heading in German', async () => {
    render(<StatusPage />);
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Dienste' })
      ).toBeInTheDocument();
    });
  });

  it('translates the database label and operational status', async () => {
    render(<StatusPage />);
    await waitFor(() => {
      expect(screen.getByText('Datenbank')).toBeInTheDocument();
    });
    expect(screen.getAllByText('Betriebsbereit').length).toBeGreaterThan(0);
  });

  it('shows the German checking state before the fetch resolves', () => {
    globalThis.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    render(<StatusPage />);
    expect(screen.getByText('Dienste werden geprüft')).toBeInTheDocument();
  });
});
