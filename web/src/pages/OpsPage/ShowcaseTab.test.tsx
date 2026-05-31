import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { getShowcase, ShowcaseData } from '../../lib/backend/getShowcase';
import ShowcaseTab from './ShowcaseTab';

vi.mock('../../lib/backend/getShowcase', () => ({
  getShowcase: vi.fn(),
}));

vi.mock('../PreviewApkgPage/CardFrame', () => ({
  CardFrame: ({ card }: { card: { templateName: string } }) => (
    <div data-testid="card-frame">{card.templateName}</div>
  ),
}));

const buildShowcase = (
  overrides: Partial<ShowcaseData> = {}
): ShowcaseData => ({
  pageTitle: 'Organic Chemistry Ch. 4',
  notionBlocks: [
    {
      id: 'b1',
      type: 'paragraph',
      hasChildren: false,
      canExpand: false,
      html: '<p>a</p>',
    },
    {
      id: 'b2',
      type: 'toggle',
      hasChildren: true,
      canExpand: true,
      html: '',
      summaryHtml: '<p>q</p>',
    },
  ],
  ankiCards: [
    {
      id: 1,
      ord: 0,
      templateName: 'Card 1',
      deckName: 'Chemistry',
      deckPath: ['Chemistry'],
      noteTypeName: 'Basic',
      css: '',
      front: 'Q',
      back: 'A',
    },
  ],
  populatedAt: '2026-05-30T10:00:00.000Z',
  ...overrides,
});

describe('ShowcaseTab', () => {
  beforeEach(() => {
    vi.mocked(getShowcase).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('shows the current showcase fetched on mount', async () => {
    vi.mocked(getShowcase).mockResolvedValue(buildShowcase());

    render(<ShowcaseTab />);

    await waitFor(() =>
      expect(screen.getByText('Organic Chemistry Ch. 4')).toBeInTheDocument()
    );
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByTestId('card-frame')).toHaveTextContent('Card 1');
  });

  test('shows the empty state when no showcase is configured', async () => {
    vi.mocked(getShowcase).mockResolvedValue(null);

    render(<ShowcaseTab />);

    await waitFor(() =>
      expect(screen.getByText(/No showcase configured/i)).toBeInTheDocument()
    );
  });
});
