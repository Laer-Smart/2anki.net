import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ChatPanel from './ChatPanel';

window.HTMLElement.prototype.scrollIntoView = vi.fn();

vi.mock('../../lib/hooks/useUserLocals', () => ({
  useUserLocals: vi.fn(),
}));

import { useUserLocals } from '../../lib/hooks/useUserLocals';

type UserLocalsReturn = ReturnType<typeof useUserLocals>;

const mockUseUserLocals = vi.mocked(useUserLocals);

const makeLocals = (chat_consent_at: string | null): UserLocalsReturn => ({
  data: {
    locals: {
      owner: 1,
      patreon: false,
      subscriber: false,
      subscriptionInfo: { active: false, email: '', linked_email: '' },
    },
    linked_email: '',
    user: {
      id: 1 as import('../../schemas/public/Users').UsersId,
      name: 'Test User',
      email: 'test@example.com',
      password: '',
      created_at: null,
      updated_at: null,
      reset_token: null,
      patreon: false,
      chat_consent_at,
    },
  },
  isLoading: false,
  error: null,
  isError: false,
  refetch: vi.fn(),
});

const consentedLocals = makeLocals('2026-01-01T00:00:00.000Z');
const unconsentedLocals = makeLocals(null);

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

beforeEach(() => {
  mockUseUserLocals.mockReturnValue(consentedLocals);
});

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

  it('renders the composer pill in the empty state', () => {
    renderChatPanel();
    expect(
      screen.getByRole('textbox', { name: 'Message input' })
    ).toBeInTheDocument();
  });

  it('does not render starter chip buttons', () => {
    renderChatPanel();
    expect(
      screen.queryByRole('button', { name: 'Make cards from a topic' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Explain this concept' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Quiz me' })
    ).not.toBeInTheDocument();
  });

  it('does not render a descriptive sub-line below the heading', () => {
    renderChatPanel();
    expect(
      screen.queryByText(
        'Ask a question, paste your notes, or attach a PDF — get flashcards back.'
      )
    ).not.toBeInTheDocument();
  });
});

describe('ChatPanel — send button state', () => {
  beforeEach(() => {
    mockPost.mockReset();
    mockGet.mockResolvedValue({ used: 0, limit: 20 });
  });

  it('send button is disabled when input is empty', () => {
    renderChatPanel();
    expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled();
  });

  it('send button is enabled when input has content', () => {
    renderChatPanel();
    const textarea = screen.getByRole('textbox', { name: 'Message input' });
    fireEvent.change(textarea, { target: { value: 'Hello' } });
    expect(screen.getByRole('button', { name: 'Send message' })).not.toBeDisabled();
  });
});

describe('ChatPanel — user message layout', () => {
  beforeEach(() => {
    mockPost.mockReset();
    mockGet.mockResolvedValue({ used: 0, limit: 20 });
  });

  it('renders user message with aria-label "User message"', async () => {
    mockPost.mockResolvedValueOnce(
      makeSseResponse([
        { event: 'done', data: { content: 'Answer', conversationId: 1 } },
      ])
    );
    renderChatPanel();
    fireEvent.change(screen.getByRole('textbox', { name: 'Message input' }), {
      target: { value: 'My question' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
    await waitFor(() => {
      expect(screen.getByLabelText('User message')).toBeInTheDocument();
    });
  });
});

describe('ChatPanel — long user message collapse', () => {
  beforeEach(() => {
    mockPost.mockReset();
    mockGet.mockResolvedValue({ used: 0, limit: 20 });
  });

  it('shows "Show full message" toggle for long messages', async () => {
    mockPost.mockResolvedValueOnce(
      makeSseResponse([
        { event: 'done', data: { content: 'Short reply', conversationId: 1 } },
      ])
    );
    const longMessage = 'A'.repeat(700);
    renderChatPanel({ initialMessages: [{ role: 'user', content: longMessage }] });
    expect(
      screen.getByRole('button', { name: 'Show full message' })
    ).toBeInTheDocument();
  });

  it('toggles to "Show less" after clicking "Show full message"', () => {
    const longMessage = 'B'.repeat(700);
    renderChatPanel({ initialMessages: [{ role: 'user', content: longMessage }] });
    fireEvent.click(screen.getByRole('button', { name: 'Show full message' }));
    expect(
      screen.getByRole('button', { name: 'Show less' })
    ).toBeInTheDocument();
  });
});

describe('ChatPanel — assistant message layout', () => {
  beforeEach(() => {
    mockPost.mockReset();
    mockGet.mockResolvedValue({ used: 0, limit: 20 });
  });

  it('renders assistant prose without a user-message aria-label', async () => {
    renderChatPanel({
      initialMessages: [
        { role: 'assistant', content: 'The answer is 42.' },
      ],
    });
    expect(screen.getByText('The answer is 42.')).toBeInTheDocument();
    expect(screen.queryByLabelText('User message')).not.toBeInTheDocument();
  });
});

describe('ChatPanel — CardPreview integration', () => {
  beforeEach(() => {
    mockPost.mockReset();
    mockGet.mockResolvedValue({ used: 0, limit: 20 });
    Object.assign(global, { URL: { createObjectURL: vi.fn(() => 'blob:test'), revokeObjectURL: vi.fn() } });
  });

  it('renders "Download deck" button when message has cards', () => {
    renderChatPanel({
      initialMessages: [
        {
          role: 'assistant',
          content: '',
          cards: [{ front: 'Q1', back: 'A1' }],
        },
      ],
    });
    expect(
      screen.getByRole('button', { name: 'Download deck' })
    ).toBeInTheDocument();
  });

  it('"Download deck" button calls the deck API', async () => {
    mockPost.mockResolvedValueOnce({
      ok: true,
      blob: () => Promise.resolve(new Blob()),
    });
    renderChatPanel({
      initialMessages: [
        {
          role: 'assistant',
          content: '',
          cards: [{ front: 'Q1', back: 'A1' }],
        },
      ],
    });
    fireEvent.click(screen.getByRole('button', { name: 'Download deck' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        '/api/chat/deck',
        expect.objectContaining({ cards: [{ front: 'Q1', back: 'A1' }] })
      );
    });
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

describe('ChatPanel — consent modal dismissal', () => {
  beforeEach(() => {
    mockPost.mockReset();
    mockGet.mockResolvedValue({ used: 0, limit: 20 });
    mockUseUserLocals.mockReturnValue(unconsentedLocals);
  });

  it('hides the consent modal after Not now is clicked and does not auto-reopen on re-render', async () => {
    const { rerender } = render(
      <MemoryRouter>
        <ChatPanel />
      </MemoryRouter>
    );

    expect(
      screen.getByRole('heading', { name: 'Chat sends your messages to Anthropic' })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Not now' }));

    expect(
      screen.queryByRole('heading', { name: 'Chat sends your messages to Anthropic' })
    ).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole('textbox', { name: 'Message input' }), {
      target: { value: 'some text' },
    });

    rerender(
      <MemoryRouter>
        <ChatPanel />
      </MemoryRouter>
    );

    expect(
      screen.queryByRole('heading', { name: 'Chat sends your messages to Anthropic' })
    ).not.toBeInTheDocument();
  });

  it('re-shows the consent modal when send fails with consent_required even after Not now was clicked', async () => {
    mockPost.mockResolvedValueOnce(
      makeSseResponse([{ event: 'error', data: { type: 'consent_required' } }])
    );

    renderChatPanel();

    fireEvent.click(screen.getByRole('button', { name: 'Not now' }));

    expect(
      screen.queryByRole('heading', { name: 'Chat sends your messages to Anthropic' })
    ).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole('textbox', { name: 'Message input' }), {
      target: { value: 'test message' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Chat sends your messages to Anthropic' })
      ).toBeInTheDocument();
    });
  });
});

describe('ChatPanel — template selector', () => {
  const assistantWithCards = [
    { role: 'user' as const, content: '20 cards about Norway' },
    {
      role: 'assistant' as const,
      content: 'Reply',
      contentBefore: 'Here you go',
      cards: [
        { front: 'Capital?', back: 'Oslo' },
        { front: 'Peninsula?', back: 'Scandinavian' },
      ],
    },
  ];

  beforeEach(() => {
    mockPost.mockReset();
    mockGet.mockResolvedValue({ used: 0, limit: 20 });
  });

  it('renders "Template: Basic" pill alongside the cards', () => {
    renderChatPanel({ initialMessages: assistantWithCards });
    expect(
      screen.getByRole('button', { name: 'Card template: Basic' })
    ).toBeInTheDocument();
  });

  it('does not render the template selector in the empty state', () => {
    renderChatPanel();
    expect(
      screen.queryByRole('button', { name: /Card template/i })
    ).not.toBeInTheDocument();
  });

  it('does not render the template selector when no assistant message has cards', () => {
    renderChatPanel({
      initialMessages: [{ role: 'assistant', content: 'Hello' }],
    });
    expect(
      screen.queryByRole('button', { name: /Card template/i })
    ).not.toBeInTheDocument();
  });

  it('opens the template dropdown on click', () => {
    renderChatPanel({ initialMessages: assistantWithCards });
    fireEvent.click(screen.getByRole('button', { name: 'Card template: Basic' }));
    expect(screen.getByRole('listbox', { name: 'Card template' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Basic \+/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Cloze/ })).toBeInTheDocument();
  });

  it('changes template when a menu item is clicked', () => {
    const onTemplateChange = vi.fn();
    mockPost.mockResolvedValueOnce(
      makeSseResponse([
        { event: 'done', data: { content: 'Reply', conversationId: 1, cards: [] } },
      ])
    );
    renderChatPanel({
      initialMessages: assistantWithCards,
      onTemplateChange,
    });
    fireEvent.click(screen.getByRole('button', { name: 'Card template: Basic' }));
    fireEvent.click(screen.getByRole('option', { name: /Cloze/ }).querySelector('button')!);
    expect(onTemplateChange).toHaveBeenCalledWith('cloze');
    expect(
      screen.getByRole('button', { name: 'Card template: Cloze' })
    ).toBeInTheDocument();
  });

  it('includes templateSlug in the message API call', async () => {
    mockPost.mockResolvedValueOnce(
      makeSseResponse([
        { event: 'done', data: { content: 'Reply', conversationId: 1 } },
      ])
    );
    renderChatPanel({
      initialMessages: assistantWithCards,
      initialTemplateSlug: 'cloze',
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Message input' }), {
      target: { value: 'Make cloze cards' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        '/api/chat/message',
        expect.objectContaining({ templateSlug: 'cloze' })
      );
    });
  });

  it('auto-regenerates the last turn when the template changes', async () => {
    mockPost.mockResolvedValueOnce(
      makeSseResponse([
        {
          event: 'done',
          data: {
            content: 'Reply',
            conversationId: 1,
            cards: [{ front: 'New', back: 'Card' }],
          },
        },
      ])
    );
    renderChatPanel({ initialMessages: assistantWithCards });
    fireEvent.click(screen.getByRole('button', { name: 'Card template: Basic' }));
    fireEvent.click(screen.getByRole('option', { name: /Cloze/ }).querySelector('button')!);
    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        '/api/chat/message',
        expect.objectContaining({
          content: '20 cards about Norway',
          templateSlug: 'cloze',
        })
      );
    });
    const regenerateCall = mockPost.mock.calls.find(
      (call) => call[0] === '/api/chat/message'
    );
    expect(regenerateCall).toBeDefined();
    expect(regenerateCall?.[1].history).toEqual([]);
  });

  it('shows a skeleton while regenerating and hides the Download button', async () => {
    let resolveSse: (v: ReturnType<typeof makeSseResponse>) => void = () => {};
    const sseResponse = new Promise<ReturnType<typeof makeSseResponse>>(
      (res) => {
        resolveSse = res;
      }
    );
    mockPost.mockReturnValueOnce(sseResponse);

    renderChatPanel({ initialMessages: assistantWithCards });
    expect(
      screen.getByRole('button', { name: 'Download deck' })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Card template: Basic' }));
    fireEvent.click(screen.getByRole('option', { name: /Cloze/ }).querySelector('button')!);

    await waitFor(() => {
      expect(
        screen.getByRole('status', {
          name: 'Rebuilding your cards with the new template',
        })
      ).toBeInTheDocument();
    });
    expect(
      screen.queryByRole('button', { name: 'Download deck' })
    ).not.toBeInTheDocument();

    resolveSse(
      makeSseResponse([
        {
          event: 'done',
          data: {
            content: 'Reply',
            conversationId: 1,
            cards: [{ front: 'New', back: 'Card' }],
          },
        },
      ])
    );

    await waitFor(() => {
      expect(
        screen.queryByRole('status', {
          name: 'Rebuilding your cards with the new template',
        })
      ).not.toBeInTheDocument();
    });
  });
});
