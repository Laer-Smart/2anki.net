import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it } from 'vitest';
import StreamingBubble from './StreamingBubble';

describe('StreamingBubble — Thinking state', () => {
  it('renders a pulsing pill with aria-label "Thinking" when loading and no streaming text', () => {
    render(
      <StreamingBubble
        isLoading={true}
        streamingText=""
        isCardStreaming={false}
      />
    );
    expect(screen.getByLabelText('Thinking')).toBeInTheDocument();
  });

  it('does not render a visible bubble bubble for Thinking — only the pill element', () => {
    render(
      <StreamingBubble
        isLoading={true}
        streamingText=""
        isCardStreaming={false}
      />
    );
    const pill = screen.getByLabelText('Thinking');
    expect(pill).toBeInTheDocument();
    expect(pill.className).toMatch(/thinkingPill/i);
  });
});

describe('StreamingBubble — streaming state', () => {
  it('renders streaming caret with aria-hidden when streaming text present', () => {
    render(
      <StreamingBubble
        isLoading={true}
        streamingText="Hello"
        isCardStreaming={false}
      />
    );
    const caret = document.querySelector(
      '[aria-hidden="true"][class*="streamingCaret"]'
    );
    expect(caret).not.toBeNull();
  });

  it('does not render the bouncing mascot when isCardStreaming', () => {
    render(
      <StreamingBubble
        isLoading={true}
        streamingText="prefix\n```json"
        isCardStreaming={true}
      />
    );
    const mascot = document.querySelector('[class*="buildingCardsMascot"]');
    expect(mascot).toBeNull();
  });

  it('renders Making your cards pill when isCardStreaming', () => {
    render(
      <StreamingBubble
        isLoading={true}
        streamingText="prefix\n```json"
        isCardStreaming={true}
      />
    );
    expect(screen.getByText('Making your cards')).toBeInTheDocument();
  });
});
