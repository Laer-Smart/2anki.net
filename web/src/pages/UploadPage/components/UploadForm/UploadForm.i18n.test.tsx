import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

import i18n from '../../../../lib/i18n';
import UploadForm from './UploadForm';

vi.mock('../../../../lib/analytics/track', () => ({
  track: vi.fn(),
}));

vi.mock('../../../../lib/hooks/useUserLocals', () => ({
  useUserLocals: vi.fn(() => ({
    data: undefined,
    isLoading: false,
    error: null,
    isError: false,
    refetch: vi.fn(),
  })),
}));

vi.mock('../../../../lib/backend/get2ankiApi', () => ({
  get2ankiApi: vi.fn(() => ({
    startPassCheckout: vi.fn().mockResolvedValue({ status: 'error' }),
  })),
}));

vi.mock('../../../../lib/hooks/useCardUsage', () => ({
  useCardUsage: vi.fn(() => null),
  CARD_USAGE_QUERY_KEY: ['cardUsage'],
}));

function renderUploadForm() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <UploadForm setErrorMessage={vi.fn()} />
      </QueryClientProvider>
    </MemoryRouter>
  );
}

describe('UploadForm dropzone in German', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('de');
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('renders the idle drop prompt in German', () => {
    renderUploadForm();
    expect(screen.getByText('Zieh deine Dateien hierher')).toBeInTheDocument();
  });

  it('translates the choose-files button and column hint', () => {
    renderUploadForm();
    expect(screen.getByText('Dateien auswählen')).toBeInTheDocument();
    expect(
      screen.getByText(/damit 2anki sie richtig zuordnet/i)
    ).toBeInTheDocument();
  });

  it('keeps the format pills untranslated', () => {
    renderUploadForm();
    expect(screen.getAllByText('.zip').length).toBeGreaterThan(0);
    expect(screen.getAllByText('.csv').length).toBeGreaterThan(0);
  });

  it('translates the Dropbox source chip prompt in German', () => {
    renderUploadForm();
    expect(
      screen.getByText(
        'Wähle eine Datei aus deiner Dropbox, um sie in einen Stapel zu konvertieren'
      )
    ).toBeInTheDocument();
  });
});
