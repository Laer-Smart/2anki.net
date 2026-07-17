import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import i18n from '../../lib/i18n';
import { ShowcaseSection } from './ShowcaseSection';

vi.mock('../../lib/backend/getShowcase', () => ({
  getShowcase: vi.fn(),
}));

import { getShowcase } from '../../lib/backend/getShowcase';

const mockGetShowcase = vi.mocked(getShowcase);

function renderShowcase() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ShowcaseSection />
    </QueryClientProvider>
  );
}

describe('ShowcaseSection', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders nothing when fetch returns null', async () => {
    mockGetShowcase.mockResolvedValue(null);
    const { container } = renderShowcase();
    await vi.waitFor(() => {
      expect(container.innerHTML).toBe('');
    });
  });

  it('renders heading and blocks when data is present', async () => {
    mockGetShowcase.mockResolvedValue({
      pageTitle: 'Test Page',
      notionBlocks: [
        {
          id: 'b1',
          type: 'paragraph',
          hasChildren: false,
          canExpand: false,
          html: '<p>Hello world</p>',
        },
      ],
      ankiCards: [
        {
          id: 1,
          ord: 0,
          templateName: 'Basic',
          deckName: 'Test',
          deckPath: ['Test'],
          noteTypeName: 'Basic',
          css: '',
          front: '<p>Front</p>',
          back: '<p>Back</p>',
        },
      ],
      populatedAt: '2026-05-16T00:00:00.000Z',
    });

    renderShowcase();

    await screen.findByText('See it in action');
    expect(screen.getByText('Notion')).toBeInTheDocument();
    expect(screen.getByText('Anki')).toBeInTheDocument();
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('translates the heading and carousel controls in German', async () => {
    await i18n.changeLanguage('de');
    mockGetShowcase.mockResolvedValue({
      pageTitle: 'Test Page',
      notionBlocks: [
        {
          id: 'b1',
          type: 'paragraph',
          hasChildren: false,
          canExpand: false,
          html: '<p>Hello world</p>',
        },
      ],
      ankiCards: [
        {
          id: 1,
          ord: 0,
          templateName: 'Basic',
          deckName: 'Test',
          deckPath: ['Test'],
          noteTypeName: 'Basic',
          css: '',
          front: '<p>Front</p>',
          back: '<p>Back</p>',
        },
        {
          id: 2,
          ord: 0,
          templateName: 'Basic',
          deckName: 'Test',
          deckPath: ['Test'],
          noteTypeName: 'Basic',
          css: '',
          front: '<p>Front 2</p>',
          back: '<p>Back 2</p>',
        },
      ],
      populatedAt: '2026-05-16T00:00:00.000Z',
    });

    renderShowcase();

    await screen.findByText('So sieht es aus');
    expect(
      screen.getByRole('button', { name: 'Vorherige Karte' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Nächste Karte' })
    ).toBeInTheDocument();
    expect(screen.getByText('Notion')).toBeInTheDocument();
    expect(screen.getByText('Anki')).toBeInTheDocument();

    await i18n.changeLanguage('en');
  });
});
