import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { BlockNode } from './BlockNode';
import { PreviewBlock } from '../../lib/backend/getPreviewBatch';

const mockUseBlockChildren = vi.fn();

vi.mock('./useBlockChildren', () => ({
  useBlockChildren: (...args: unknown[]) => mockUseBlockChildren(...args),
}));

const emptyChildren = {
  data: undefined,
  isLoading: false,
  error: null,
  refetch: vi.fn(),
};

function makeChildren() {
  return {
    data: {
      pages: [
        {
          blocks: [
            {
              id: 'child-1',
              type: 'paragraph',
              hasChildren: false,
              canExpand: false,
              html: '<p>Child block</p>',
            },
          ],
          nextCursor: null,
          hasMore: false,
        },
      ],
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  };
}

function renderBlock(block: PreviewBlock) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <BlockNode block={block} />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const base: PreviewBlock = {
  id: 'b1',
  type: 'paragraph',
  hasChildren: false,
  canExpand: false,
  html: '<p>Hello</p>',
};

describe('BlockNode — child_page with childPageId', () => {
  it('renders a Link to the child preview route', () => {
    mockUseBlockChildren.mockReturnValue(emptyChildren);
    const block: PreviewBlock = {
      ...base,
      type: 'child_page',
      childPageId: 'child-123',
      childPageTitle: 'Chapter 1',
      html: 'Chapter 1',
      decision: 'recurse',
    };
    renderBlock(block);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/preview/child-123');
    expect(screen.getByText('Sub-page')).toBeInTheDocument();
  });

  it('tooltip shows recurse copy when decision is recurse', () => {
    mockUseBlockChildren.mockReturnValue(emptyChildren);
    const block: PreviewBlock = {
      ...base,
      type: 'child_page',
      childPageId: 'child-123',
      html: 'Chapter 1',
      decision: 'recurse',
    };
    const { container } = renderBlock(block);
    const row = container.firstChild as HTMLElement;
    expect(row.title).toBe('Opens as a sub-page — click to explore');
  });
});

describe('BlockNode — child_page without childPageId', () => {
  it('falls back to plain div when childPageId is absent', () => {
    mockUseBlockChildren.mockReturnValue(emptyChildren);
    const block: PreviewBlock = {
      ...base,
      type: 'child_page',
      html: '<p>No id</p>',
      decision: 'skip',
    };
    renderBlock(block);
    expect(screen.queryByRole('link')).toBeNull();
  });
});

describe('BlockNode — gutter stripe classes', () => {
  it('applies card class for card decision', () => {
    mockUseBlockChildren.mockReturnValue(emptyChildren);
    const block: PreviewBlock = { ...base, decision: 'card' };
    const { container } = renderBlock(block);
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain('blockCard');
  });

  it('applies skip class for skip decision', () => {
    mockUseBlockChildren.mockReturnValue(emptyChildren);
    const block: PreviewBlock = { ...base, decision: 'skip' };
    const { container } = renderBlock(block);
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain('blockSkip');
  });

  it('shows correct tooltip for card decision', () => {
    mockUseBlockChildren.mockReturnValue(emptyChildren);
    const block: PreviewBlock = { ...base, decision: 'card' };
    const { container } = renderBlock(block);
    const div = container.firstChild as HTMLElement;
    expect(div.title).toBe('This block becomes a card');
  });

  it('shows correct tooltip for skip decision', () => {
    mockUseBlockChildren.mockReturnValue(emptyChildren);
    const block: PreviewBlock = { ...base, decision: 'skip' };
    const { container } = renderBlock(block);
    const div = container.firstChild as HTMLElement;
    expect(div.title).toBe('Skipped — not converted');
  });
});

describe('BlockNode — toggle block (canExpand, not container type)', () => {
  it('renders a details element', () => {
    mockUseBlockChildren.mockReturnValue(emptyChildren);
    const block: PreviewBlock = {
      ...base,
      type: 'toggle',
      hasChildren: true,
      canExpand: true,
      html: '',
      summaryHtml: '<span>Toggle title</span>',
    };
    const { container } = renderBlock(block);
    expect(container.querySelector('details')).toBeInTheDocument();
  });
});

describe('BlockNode — auto-container (column_list / column / table)', () => {
  it('renders children inline without a details element for column_list', () => {
    mockUseBlockChildren.mockReturnValue(makeChildren());
    const block: PreviewBlock = {
      ...base,
      id: 'col-list',
      type: 'column_list',
      hasChildren: true,
      canExpand: true,
      html: '',
      summaryHtml: '<span>Columns</span>',
    };
    const { container } = renderBlock(block);
    expect(container.querySelector('details')).not.toBeInTheDocument();
    expect(screen.getByText('Child block')).toBeInTheDocument();
  });

  it('renders children inline without a details element for column', () => {
    mockUseBlockChildren.mockReturnValue(makeChildren());
    const block: PreviewBlock = {
      ...base,
      id: 'col',
      type: 'column',
      hasChildren: true,
      canExpand: true,
      html: '',
      summaryHtml: '<span>Column</span>',
    };
    const { container } = renderBlock(block);
    expect(container.querySelector('details')).not.toBeInTheDocument();
    expect(screen.getByText('Child block')).toBeInTheDocument();
  });

  it('renders children inline without a details element for table', () => {
    mockUseBlockChildren.mockReturnValue(makeChildren());
    const block: PreviewBlock = {
      ...base,
      id: 'tbl',
      type: 'table',
      hasChildren: true,
      canExpand: true,
      html: '',
      summaryHtml: '<span>Table</span>',
    };
    const { container } = renderBlock(block);
    expect(container.querySelector('details')).not.toBeInTheDocument();
    expect(screen.getByText('Child block')).toBeInTheDocument();
  });

  it('passes enabled=true to useBlockChildren without requiring click', () => {
    mockUseBlockChildren.mockReturnValue(emptyChildren);
    const block: PreviewBlock = {
      ...base,
      id: 'col-list',
      type: 'column_list',
      hasChildren: true,
      canExpand: true,
      html: '',
    };
    renderBlock(block);
    expect(mockUseBlockChildren).toHaveBeenCalledWith('col-list', true);
  });
});
