import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { BlockNode } from './BlockNode';
import { PreviewBlock } from '../../lib/backend/getPreviewBatch';

vi.mock('./useBlockChildren', () => ({
  useBlockChildren: () => ({
    data: undefined,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

function renderBlock(block: PreviewBlock) {
  return render(
    <MemoryRouter>
      <BlockNode block={block} />
    </MemoryRouter>
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
    const block: PreviewBlock = { ...base, decision: 'card' };
    const { container } = renderBlock(block);
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain('blockCard');
  });

  it('applies skip class for skip decision', () => {
    const block: PreviewBlock = { ...base, decision: 'skip' };
    const { container } = renderBlock(block);
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain('blockSkip');
  });

  it('shows correct tooltip for card decision', () => {
    const block: PreviewBlock = { ...base, decision: 'card' };
    const { container } = renderBlock(block);
    const div = container.firstChild as HTMLElement;
    expect(div.title).toBe('This block becomes a card');
  });

  it('shows correct tooltip for skip decision', () => {
    const block: PreviewBlock = { ...base, decision: 'skip' };
    const { container } = renderBlock(block);
    const div = container.firstChild as HTMLElement;
    expect(div.title).toBe('Skipped — not converted');
  });
});
