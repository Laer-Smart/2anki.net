import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';
import ConversationsSidebar, {
  ConversationSummary,
} from './ConversationsSidebar';

const conversations: ConversationSummary[] = [
  { id: 1, title: 'Photosynthesis', updatedAt: '2026-06-10T00:00:00.000Z' },
  { id: 2, title: 'French verbs', updatedAt: '2026-06-09T00:00:00.000Z' },
];

function renderSidebar(
  overrides: Partial<Parameters<typeof ConversationsSidebar>[0]> = {}
) {
  const props = {
    conversations,
    activeId: null,
    onSelect: vi.fn(),
    onNew: vi.fn(),
    onRename: vi.fn(),
    onDelete: vi.fn(),
    isOpen: false,
    onClose: vi.fn(),
    ...overrides,
  };
  render(<ConversationsSidebar {...props} />);
  return props;
}

describe('ConversationsSidebar', () => {
  it('renders the conversation list', () => {
    renderSidebar();
    expect(screen.getByText('Photosynthesis')).toBeInTheDocument();
    expect(screen.getByText('French verbs')).toBeInTheDocument();
  });

  it('does not render the scrim when closed', () => {
    renderSidebar({ isOpen: false });
    expect(
      screen.queryByRole('button', { name: 'Close conversations' })
    ).not.toBeInTheDocument();
  });

  it('renders the scrim when open', () => {
    renderSidebar({ isOpen: true });
    expect(
      screen.getByRole('button', { name: 'Close conversations' })
    ).toBeInTheDocument();
  });

  it('calls onClose when the scrim is clicked', () => {
    const props = renderSidebar({ isOpen: true });
    fireEvent.click(
      screen.getByRole('button', { name: 'Close conversations' })
    );
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape is pressed while open', () => {
    const props = renderSidebar({ isOpen: true });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('does not react to Escape when closed', () => {
    const props = renderSidebar({ isOpen: false });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it('calls onSelect with the conversation id', () => {
    const props = renderSidebar();
    fireEvent.click(screen.getByText('Photosynthesis'));
    expect(props.onSelect).toHaveBeenCalledWith(1);
  });
});
