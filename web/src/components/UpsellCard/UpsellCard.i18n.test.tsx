import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

import i18n from '../../lib/i18n';
import { UpsellCard } from './UpsellCard';

vi.mock('../../lib/backend/get2ankiApi', () => ({
  get2ankiApi: () => ({ startPassCheckout: vi.fn() }),
}));

const mockUseUserLocals = vi.fn();
vi.mock('../../lib/hooks/useUserLocals', () => ({
  useUserLocals: () => mockUseUserLocals(),
}));

vi.mock('../../lib/hooks/useCardUsage', () => ({
  useCardUsage: () => null,
}));

vi.mock('../../lib/analytics/track', () => ({ track: vi.fn() }));

function renderCard(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe('UpsellCard in German', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('de');
    mockUseUserLocals.mockReturnValue({
      data: {
        locals: { patreon: false, subscriber: false },
        user: { email: 'free@example.com' },
      },
    });
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('translates the headline and the see-plans link', () => {
    renderCard(<UpsellCard surface="downloads_upsell" />);
    expect(
      screen.getByText('Konvertierst du diesen Monat mehr?')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Tarife ansehen' })
    ).toBeInTheDocument();
  });
});
