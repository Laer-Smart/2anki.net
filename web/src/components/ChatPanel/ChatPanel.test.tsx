import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ChatPanel from './ChatPanel';

window.HTMLElement.prototype.scrollIntoView = vi.fn();

vi.mock('../../lib/hooks/useUserLocals', () => ({
  useUserLocals: () => ({
    data: {
      user: { patreon: false, chat_consent_at: '2026-01-01T00:00:00.000Z' },
    },
    refetch: vi.fn(),
  }),
}));

vi.mock('../../lib/backend/api', () => ({
  post: vi.fn(),
  postMultipart: vi.fn(),
  get: vi.fn().mockResolvedValue({ used: 0, limit: 20 }),
  patch: vi.fn(),
  del: vi.fn(),
}));

import { get, post } from '../../lib/backend/api';

const mockPost = post as ReturnType<typeof vi.fn>;
const mockGet = get as ReturnType<typeof vi.fn>;

function makeSseResponse(events: Array<{ event: string; data: unknown }>) {
  const encoder = new TextEncoder();
  const chunks = events.map(({ event, data }) =>
    encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
  );
  const stream = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });
  return { ok: true, status: 200, body: stream };
}

function renderChatPanel(props: React.ComponentProps<typeof ChatPanel> = {}) {
  return render(
    <MemoryRouter>
      <ChatPanel {...props} />
    </MemoryRouter>
  );
}

describe('ChatPanel — empty state', () => {
  beforeEach(() => {
    mockPost.mockReset();
    mockGet.mockResolvedValue({ used: 0, limit: 20 });
  });

  it('renders heading "What are you studying?" when no messages', () => {
    renderChatPanel();
    expect(
      screen.getByRole('heading', { name: 'What are you studying?' })
    ).toBeInTheDocument();
  });

  it('renders sub-line copy when no messages', () => {
    renderChatPanel();
    expect(
      screen.getByText(
        'Ask a question, paste your notes, or attach a PDF — get flashcards back.'
      )
    ).toBeInTheDocument();
  });

  it('renders three starter chip buttons', () => {
    renderChatPanel();
    expect(
      screen.getByRole('button', { name: 'Make cards from a topic' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Explain this concept' })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Quiz me' })).toBeInTheDocument();
  });

  it('clicking a chip prefills the textarea and does not autosubmit', async () => {
    renderChatPanel();
    fireEvent.click(
      screen.getByRole('button', { name: 'Make cards from a topic' })
    );
    const textarea = screen.getByRole('textbox', {
      name: 'Message input',
    }) as HTMLTextAreaElement;
    expect(textarea.value).toBe('Help me make cards from ');
    expect(mockPost).not.toHaveBeenCalled();
  });
});

describe('ChatPanel — aria-live', () => {
  it('message list container has aria-live="polite"', async () => {
    mockPost.mockResolvedValueOnce(
      makeSseResponse([
        { event: 'done', data: { content: 'Hello', conversationId: 1 } },
      ])
    );
    renderChatPanel();
    fireEvent.change(screen.getByRole('textbox', { name: 'Message input' }), {
      target: { value: 'Hi' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
    await waitFor(() => {
      const liveRegion = document.querySelector('[aria-live="polite"]');
      expect(liveRegion).not.toBeNull();
    });
  });
});

describe('ChatPanel', () => {
  beforeEach(() => {
    mockPost.mockReset();
    mockGet.mockResolvedValue({ used: 0, limit: 20 });
    mockPost.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    } as Response);
  });

  it('renders with initialPrompt pre-filled in the textarea', () => {
    renderChatPanel({
      initialPrompt: 'My PDF converted but produced 0 cards.',
    });
    const textarea = screen.getByRole('textbox', {
      name: 'Message input',
    }) as HTMLTextAreaElement;
    expect(textarea.value).toBe('My PDF converted but produced 0 cards.');
  });

  it('renders the message input without initialPrompt', () => {
    renderChatPanel();
    expect(
      screen.getByRole('textbox', { name: 'Message input' })
    ).toBeInTheDocument();
  });

  it('syncs the textarea when initialPrompt changes after mount', () => {
    const { rerender } = render(
      <MemoryRouter>
        <ChatPanel initialPrompt="" />
      </MemoryRouter>
    );
    const textarea = screen.getByRole('textbox', {
      name: 'Message input',
    }) as HTMLTextAreaElement;
    expect(textarea.value).toBe('');

    rerender(
      <MemoryRouter>
        <ChatPanel initialPrompt="Turn this into cloze cards: [paste]" />
      </MemoryRouter>
    );
    expect(textarea.value).toBe('Turn this into cloze cards: [paste]');
  });

  it('calls /api/chat/message when message is sent', async () => {
    mockPost.mockResolvedValueOnce(
      makeSseResponse([
        {
          event: 'done',
          data: { content: 'Here is some advice.', conversationId: 1 },
        },
      ])
    );

    renderChatPanel();

    fireEvent.change(screen.getByRole('textbox', { name: 'Message input' }), {
      target: { value: 'What went wrong?' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        '/api/chat/message',
        expect.objectContaining({
          content: 'What went wrong?',
        })
      );
    });
  });

  it('handles consent_required by showing the consent modal', async () => {
    mockPost.mockResolvedValueOnce(
      makeSseResponse([{ event: 'error', data: { type: 'consent_required' } }])
    );

    renderChatPanel();

    fireEvent.change(screen.getByRole('textbox', { name: 'Message input' }), {
      target: { value: 'Help me' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    await waitFor(() => {
      expect(
        screen.getByRole('heading', {
          name: 'Chat sends your messages to Anthropic',
        })
      ).toBeInTheDocument();
    });
  });

  it('handles rate_limit by showing the limit panel', async () => {
    mockPost.mockResolvedValueOnce(
      makeSseResponse([
        {
          event: 'error',
          data: { type: 'rate_limit', resetDate: '2026-06-01T00:00:00.000Z' },
        },
      ])
    );

    renderChatPanel();

    fireEvent.change(screen.getByRole('textbox', { name: 'Message input' }), {
      target: { value: 'Help me' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    await waitFor(() => {
      expect(
        screen.getByText(/You've used all 20 messages this month/)
      ).toBeInTheDocument();
    });
  });

  it('shows thinking pill with aria-label when loading with no streamed tokens yet', async () => {
    let resolveStream!: () => void;
    const neverEndingStream = new ReadableStream({
      start(controller) {
        resolveStream = () => controller.close();
      },
    });
    mockPost.mockResolvedValueOnce({
      ok: true,
      status: 200,
      body: neverEndingStream,
    });

    renderChatPanel();

    fireEvent.change(screen.getByRole('textbox', { name: 'Message input' }), {
      target: { value: 'What is spaced repetition?' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    await waitFor(() => {
      expect(
        screen.getByRole('status', { name: 'Thinking' })
      ).toBeInTheDocument();
    });

    expect(screen.queryByText('Claude')).not.toBeInTheDocument();
    expect(document.querySelector('[class*="messageSkeleton"]')).toBeNull();

    resolveStream();
  });

  it('renders streaming caret while tokens arrive and removes it after done', async () => {
    mockPost.mockResolvedValueOnce(
      makeSseResponse([
        { event: 'token', data: 'Hello' },
        { event: 'token', data: ' there' },
        {
          event: 'done',
          data: { content: 'Hello there.', conversationId: 42 },
        },
      ])
    );

    renderChatPanel();

    fireEvent.change(screen.getByRole('textbox', { name: 'Message input' }), {
      target: { value: 'Tell me something' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    await waitFor(() => {
      expect(screen.getByText('Hello there.')).toBeInTheDocument();
    });

    const caret = document.querySelector(
      '[aria-hidden="true"][class*="streamingCaret"]'
    );
    expect(caret).toBeNull();
  });

  it('Esc blurs the composer textarea without clearing its value', () => {
    renderChatPanel();

    const textarea = screen.getByRole('textbox', {
      name: 'Message input',
    }) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Draft message' } });
    textarea.focus();
    expect(document.activeElement).toBe(textarea);

    fireEvent.keyDown(textarea, { key: 'Escape' });

    expect(document.activeElement).not.toBe(textarea);
    expect(textarea.value).toBe('Draft message');
  });

  it('scroll-to-bottom pill appears during streaming when user scrolled away', async () => {
    let resolveStream!: () => void;
    const neverEndingStream = new ReadableStream({
      start(controller) {
        resolveStream = () => controller.close();
      },
    });
    mockPost.mockResolvedValueOnce({
      ok: true,
      status: 200,
      body: neverEndingStream,
    });

    renderChatPanel();

    fireEvent.change(screen.getByRole('textbox', { name: 'Message input' }), {
      target: { value: 'Tell me about spaced repetition' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    await waitFor(() => {
      expect(screen.getByRole('status', { name: 'Thinking' })).toBeInTheDocument();
    });

    const messageList = document.querySelector('[class*="messageList"]') as HTMLElement;
    if (messageList != null) {
      Object.defineProperty(messageList, 'scrollHeight', {
        get: () => 1000,
        configurable: true,
      });
      Object.defineProperty(messageList, 'scrollTop', {
        get: () => 0,
        configurable: true,
      });
      Object.defineProperty(messageList, 'clientHeight', {
        get: () => 400,
        configurable: true,
      });
      act(() => {
        messageList.dispatchEvent(new Event('scroll'));
      });
    }

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Scroll to bottom' })
      ).toBeInTheDocument();
    });

    resolveStream();
  });

  it('Enter still sends the message after Esc handler is added', async () => {
    mockPost.mockResolvedValueOnce(
      makeSseResponse([
        { event: 'done', data: { content: 'Reply text', conversationId: 10 } },
      ])
    );

    renderChatPanel();

    const textarea = screen.getByRole('textbox', {
      name: 'Message input',
    }) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Press enter to send' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        '/api/chat/message',
        expect.objectContaining({
          content: 'Press enter to send',
        })
      );
    });
  });
});
