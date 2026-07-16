import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import i18n from '../../../lib/i18n';
import ReviewDataExport from './ReviewDataExport';
import { Backend } from '../../../lib/backend/Backend';

const makeBackend = (): Backend =>
  ({
    listAnkifySubscriptions: vi.fn(async () => []),
    listAnkifyNotionDatabases: vi.fn(async () => []),
  }) as unknown as Backend;

const renderExport = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ReviewDataExport backend={makeBackend()} />
    </QueryClientProvider>
  );
};

describe('ReviewDataExport in German', () => {
  beforeEach(async () => {
    globalThis.localStorage?.clear();
    await i18n.changeLanguage('de');
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('renders the first-run heading and create button in German', async () => {
    renderExport();
    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: 'Wohin geht deine Lernhistorie?' })
      ).toBeInTheDocument()
    );
    expect(
      screen.getByRole('button', {
        name: 'Meinen Wiederholungs-Tracker erstellen',
      })
    ).toBeInTheDocument();
  });
});
