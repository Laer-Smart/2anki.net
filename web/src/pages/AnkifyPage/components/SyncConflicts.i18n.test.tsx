import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import i18n from '../../../lib/i18n';
import SyncConflicts from './SyncConflicts';
import { Backend } from '../../../lib/backend/Backend';

const makeBackend = (): Backend =>
  ({
    listAnkifyConflicts: vi.fn(async () => [
      {
        id: 1,
        source_id: 'page-1',
        notion_snapshot: { front: 'Front N', back: 'Back N' },
        anki_snapshot: { front: 'Front A', back: 'Back A' },
      },
    ]),
    listAnkifySubscriptions: vi.fn(async () => []),
  }) as unknown as Backend;

const renderConflicts = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <SyncConflicts backend={makeBackend()} />
    </QueryClientProvider>
  );
};

describe('SyncConflicts in German', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('de');
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('renders the keep-decision buttons in German', async () => {
    renderConflicts();
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Die aus Notion behalten' })
      ).toBeInTheDocument()
    );
    expect(
      screen.getByRole('heading', { name: 'Welche möchtest du behalten?' })
    ).toBeInTheDocument();
  });
});
