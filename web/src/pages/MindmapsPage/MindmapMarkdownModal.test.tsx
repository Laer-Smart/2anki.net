import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createElement } from 'react';
import { MindmapMarkdownModal } from './MindmapMarkdownModal';

describe('MindmapMarkdownModal', () => {
  it('renders the dialog with correct role and aria-modal', () => {
    render(createElement(MindmapMarkdownModal, { onClose: vi.fn() }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeDefined();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
  });

  it('renders the title "Markdown in node labels"', () => {
    render(createElement(MindmapMarkdownModal, { onClose: vi.fn() }));
    expect(screen.getByText('Markdown in node labels')).toBeDefined();
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn();
    render(createElement(MindmapMarkdownModal, { onClose }));
    const closeBtn = screen.getByLabelText('Close');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    render(createElement(MindmapMarkdownModal, { onClose }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn();
    render(createElement(MindmapMarkdownModal, { onClose }));
    const backdrop = screen.getByTestId('markdown-modal-backdrop');
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not close when the card itself is clicked', () => {
    const onClose = vi.fn();
    render(createElement(MindmapMarkdownModal, { onClose }));
    const card = screen.getByTestId('markdown-modal-card');
    fireEvent.click(card);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('shows "You type" and "You get" column headers', () => {
    render(createElement(MindmapMarkdownModal, { onClose: vi.fn() }));
    expect(screen.getByText('You type')).toBeDefined();
    expect(screen.getByText('You get')).toBeDefined();
  });

  it('documents bold syntax', () => {
    render(createElement(MindmapMarkdownModal, { onClose: vi.fn() }));
    expect(screen.getByText('**bold**')).toBeDefined();
  });

  it('documents italic syntax', () => {
    render(createElement(MindmapMarkdownModal, { onClose: vi.fn() }));
    expect(screen.getByText('*italic*')).toBeDefined();
  });

  it('documents inline code syntax', () => {
    render(createElement(MindmapMarkdownModal, { onClose: vi.fn() }));
    expect(screen.getByText('`code`')).toBeDefined();
  });
});
