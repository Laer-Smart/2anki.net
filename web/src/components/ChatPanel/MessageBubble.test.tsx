import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';
import MessageBubble from './MessageBubble';

describe('MessageBubble — user role', () => {
  it('renders with aria-label "User message"', () => {
    render(
      <MessageBubble
        message={{ role: 'user', content: 'Hello' }}
        expanded={false}
        onToggleExpand={vi.fn()}
      />
    );
    expect(screen.getByLabelText('User message')).toBeInTheDocument();
  });

  it('aligns to the right (has messageUser class or aria-label)', () => {
    render(
      <MessageBubble
        message={{ role: 'user', content: 'Hello' }}
        expanded={false}
        onToggleExpand={vi.fn()}
      />
    );
    const el = screen.getByLabelText('User message');
    expect(el.className).toMatch(/messageUser/i);
  });

  it('preserves long message collapse toggle', () => {
    const longContent = 'x'.repeat(601);
    const onToggle = vi.fn();
    render(
      <MessageBubble
        message={{ role: 'user', content: longContent }}
        expanded={false}
        onToggleExpand={onToggle}
      />
    );
    const toggle = screen.getByRole('button', { name: 'Show full message' });
    expect(toggle).toBeInTheDocument();
    fireEvent.click(toggle);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('shows Show less button when expanded is true', () => {
    const longContent = 'x'.repeat(601);
    render(
      <MessageBubble
        message={{ role: 'user', content: longContent }}
        expanded={true}
        onToggleExpand={vi.fn()}
      />
    );
    expect(
      screen.getByRole('button', { name: 'Show less' })
    ).toBeInTheDocument();
  });
});

describe('MessageBubble — assistant role', () => {
  it('does not render a "Claude" sender label', () => {
    render(
      <MessageBubble
        message={{ role: 'assistant', content: 'A response' }}
        expanded={false}
        onToggleExpand={vi.fn()}
      />
    );
    expect(screen.queryByText('Claude')).not.toBeInTheDocument();
  });

  it('does not have a bubble background class on the prose container', () => {
    render(
      <MessageBubble
        message={{ role: 'assistant', content: 'A response' }}
        expanded={false}
        onToggleExpand={vi.fn()}
      />
    );
    const bubble = document.querySelector('[class*="messageBubbleUser"]');
    expect(bubble).toBeNull();
  });
});
