import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { BlockNode } from './BlockNode';

const mockUseBlockChildren = vi.fn();

vi.mock('./useBlockChildren', () => ({
  useBlockChildren: (...args: unknown[]) => mockUseBlockChildren(...args),
}));

function wrap(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

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

const emptyChildren = { data: undefined, isLoading: false, error: null, refetch: vi.fn() };

describe('BlockNode — non-expandable block', () => {
  it('renders html directly', () => {
    mockUseBlockChildren.mockReturnValue(emptyChildren);

    const block = {
      id: 'b1',
      type: 'paragraph',
      hasChildren: false,
      canExpand: false,
      html: '<p>Hello</p>',
    };

    const { container } = wrap(<BlockNode block={block} />);
    expect(container.querySelector('p')?.textContent).toBe('Hello');
  });
});

describe('BlockNode — toggle block (canExpand, not container type)', () => {
  it('renders a details element', () => {
    mockUseBlockChildren.mockReturnValue(emptyChildren);

    const block = {
      id: 'b1',
      type: 'toggle',
      hasChildren: true,
      canExpand: true,
      html: '',
      summaryHtml: '<span>Toggle title</span>',
    };

    const { container } = wrap(<BlockNode block={block} />);
    expect(container.querySelector('details')).toBeInTheDocument();
  });
});

describe('BlockNode — auto-container (column_list)', () => {
  it('renders children inline without a details element', () => {
    mockUseBlockChildren.mockReturnValue(makeChildren());

    const block = {
      id: 'col-list',
      type: 'column_list',
      hasChildren: true,
      canExpand: true,
      html: '',
      summaryHtml: '<span>Columns</span>',
    };

    const { container } = wrap(<BlockNode block={block} />);

    expect(container.querySelector('details')).not.toBeInTheDocument();
    expect(screen.getByText('Child block')).toBeInTheDocument();
  });

  it('renders children inline without a details element for column type', () => {
    mockUseBlockChildren.mockReturnValue(makeChildren());

    const block = {
      id: 'col',
      type: 'column',
      hasChildren: true,
      canExpand: true,
      html: '',
      summaryHtml: '<span>Column</span>',
    };

    const { container } = wrap(<BlockNode block={block} />);

    expect(container.querySelector('details')).not.toBeInTheDocument();
    expect(screen.getByText('Child block')).toBeInTheDocument();
  });

  it('renders children inline without a details element for table type', () => {
    mockUseBlockChildren.mockReturnValue(makeChildren());

    const block = {
      id: 'tbl',
      type: 'table',
      hasChildren: true,
      canExpand: true,
      html: '',
      summaryHtml: '<span>Table</span>',
    };

    const { container } = wrap(<BlockNode block={block} />);

    expect(container.querySelector('details')).not.toBeInTheDocument();
    expect(screen.getByText('Child block')).toBeInTheDocument();
  });

  it('passes enabled=true to useBlockChildren without requiring click', () => {
    mockUseBlockChildren.mockReturnValue(emptyChildren);

    const block = {
      id: 'col-list',
      type: 'column_list',
      hasChildren: true,
      canExpand: true,
      html: '',
    };

    wrap(<BlockNode block={block} />);

    expect(mockUseBlockChildren).toHaveBeenCalledWith('col-list', true);
  });
});
