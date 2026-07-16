import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import i18n from '../../../lib/i18n';
import LeechesPanel from './LeechesPanel';
import { Backend } from '../../../lib/backend/Backend';

vi.mock('../../../lib/analytics/track', () => ({
  track: vi.fn(),
}));

const makeBackend = (): Backend =>
  ({
    listAnkifyLeeches: vi.fn(async () => ({
      connected: true as const,
      leeches: [],
    })),
  }) as unknown as Backend;

const renderPanel = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <LeechesPanel backend={makeBackend()} />
    </QueryClientProvider>
  );
};

describe('LeechesPanel in German', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('de');
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('renders the empty-state copy in German', async () => {
    renderPanel();
    await waitFor(() =>
      expect(
        screen.getByText(/Noch keine Blutegel\. Anki markiert eine Karte/i)
      ).toBeInTheDocument()
    );
  });
});
