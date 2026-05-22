import { useCallback, useEffect, useRef, useState } from 'react';
import { get, patch, post, postMultipart } from '../../lib/backend/api';
import { useUserLocals } from '../../lib/hooks/useUserLocals';
import ConsentModal from '../ConsentModal/ConsentModal';
import styles from './ChatPanel.module.css';
import ComposerArea from './ComposerArea';
import MessageBubble from './MessageBubble';
import StreamingBubble from './StreamingBubble';

export interface ChatCard {
  front: string;
  back: string;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  contentBefore?: string;
  contentAfter?: string;
  cards?: ChatCard[];
}

interface ApiDonePayload {
  content: string;
  conversationId: number;
  contentBefore?: string;
  contentAfter?: string;
  cards?: ChatCard[];
}

interface ApiErrorPayload {
  type:
    | 'rate_limit'
    | 'server_error'
    | 'conversation_not_found'
    | 'consent_required';
  resetDate?: string;
}

interface ApiUsageResponse {
  used: number;
  limit: number | null;
}

export interface ChatPanelProps {
  initialPrompt?: string;
  cameFromUpload?: boolean;
  onCardsGenerated?: (cards: ChatCard[]) => void;
  initialConversationId?: number | null;
  initialMessages?: Message[];
  onConversationCreated?: (id: number, title: string) => void;
  onConversationNotFound?: () => void;
}

const DRAFT_DEBOUNCE_MS = 500;

type ChipState = 'idle' | 'uploading' | 'failed';

interface AttachmentChip {
  id: string;
  file: File;
  state: ChipState;
  retryCount: number;
}

const ALLOWED_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
]);

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_TOTAL_BYTES = 25 * 1024 * 1024;
const MAX_FILE_COUNT = 5;

const FREE_MONTHLY_LIMIT = 20;

const STARTER_CHIPS = [
  { label: 'Make cards from a topic', prefill: 'Help me make cards from ' },
  { label: 'Explain this concept', prefill: 'Explain ' },
  { label: 'Quiz me', prefill: 'Quiz me on ' },
] as const;

function formatResetDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function parseSseEvent(
  rawEvent: string
): { eventType: string; data: string } | null {
  if (!rawEvent.trim()) return null;
  let eventType = '';
  let data = '';
  for (const line of rawEvent.split('\n')) {
    if (line.startsWith('event: ')) {
      eventType = line.slice(7).trim();
    } else if (line.startsWith('data: ')) {
      data = line.slice(6);
    }
  }
  if (eventType === '') return null;
  return { eventType, data };
}

async function downloadDeck(
  cards: ChatCard[],
  deckName: string
): Promise<void> {
  const response = await post('/api/chat/deck', { cards, deckName });
  if (!response.ok) {
    throw new Error('Failed to generate deck');
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${deckName}.apkg`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ChatPanel({
  initialPrompt,
  cameFromUpload,
  onCardsGenerated,
  initialConversationId,
  initialMessages,
  onConversationCreated,
  onConversationNotFound,
}: ChatPanelProps) {
  const { data: userLocals, refetch: refetchUserLocals } = useUserLocals();
  const isPatreon = userLocals?.user?.patreon === true;
  const hasConsented = userLocals?.user?.chat_consent_at != null;
  const [showConsentModal, setShowConsentModal] = useState(false);

  const [activeConversationId, setActiveConversationId] = useState<
    number | null
  >(initialConversationId ?? null);
  const [messages, setMessages] = useState<Message[]>(initialMessages ?? []);
  const [expandedUserMessages, setExpandedUserMessages] = useState<Set<number>>(
    new Set()
  );
  const [streamingText, setStreamingText] = useState('');
  const [inputValue, setInputValue] = useState(initialPrompt ?? '');

  useEffect(() => {
    if (initialPrompt != null && initialPrompt !== '') {
      setInputValue(initialPrompt);
    }
  }, [initialPrompt]);

  const [isLoading, setIsLoading] = useState(false);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [resetDate, setResetDate] = useState<string | null>(null);
  const [messagesUsedThisMonth, setMessagesUsedThisMonth] = useState(0);
  const [chips, setChips] = useState<AttachmentChip[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const messageListRef = useRef<HTMLDivElement>(null);
  const composerTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const lastSavedDraftRef = useRef<string>('');

  useEffect(() => {
    get('/api/chat/usage', { redirect: false })
      .then((data: ApiUsageResponse | undefined) => {
        if (data != null) {
          setMessagesUsedThisMonth(data.used);
          if (data.limit != null && data.used >= data.limit) {
            setLimitReached(true);
          }
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const el = messageListRef.current;
    if (el == null) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom < 120) {
      bottomRef.current?.scrollIntoView({
        behavior: streamingText.length > 0 ? 'auto' : 'smooth',
      });
    }
  }, [messages, isLoading, streamingText]);

  useEffect(() => {
    if (activeConversationId == null) return;
    if (inputValue === lastSavedDraftRef.current) return;
    const conversationId = activeConversationId;
    const draft = inputValue;
    const handle = setTimeout(() => {
      patch(`/api/chat/conversations/${conversationId}/draft`, {
        content: draft.length === 0 ? null : draft,
      })
        .then(() => {
          lastSavedDraftRef.current = draft;
        })
        .catch(() => {});
    }, DRAFT_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [inputValue, activeConversationId]);

  const remainingMessages = FREE_MONTHLY_LIMIT - messagesUsedThisMonth;

  const readyChips = chips.filter((c) => c.state === 'idle');
  const canSend =
    (inputValue.trim().length > 0 || readyChips.length > 0) &&
    !isLoading &&
    !limitReached;

  function addFiles(files: File[]) {
    setNetworkError(null);

    const disallowed = files.filter((f) => !ALLOWED_TYPES.has(f.type));
    if (disallowed.length > 0) {
      if (disallowed.length === 1) {
        setNetworkError(
          `Can't attach ${disallowed[0].name}. Only PDF and image files work here.`
        );
      } else {
        setNetworkError(
          `Can't attach ${disallowed.length} files. Only PDF and image files work here.`
        );
      }
      return;
    }

    const oversized = files.find((f) => f.size > MAX_FILE_BYTES);
    if (oversized != null) {
      setNetworkError(
        `${oversized.name} is ${formatFileSize(oversized.size)}. The per-file limit is 10 MB.`
      );
      return;
    }

    const currentTotal = chips.reduce((s, c) => s + c.file.size, 0);
    const newTotal = files.reduce((s, f) => s + f.size, currentTotal);
    if (newTotal > MAX_TOTAL_BYTES) {
      setNetworkError(
        `That's ${formatFileSize(newTotal)} total. A message can carry up to 25 MB across all files.`
      );
      return;
    }

    const currentCount = chips.length;
    const allowedCount = Math.max(0, MAX_FILE_COUNT - currentCount);
    const toAdd = files.slice(0, allowedCount);

    setChips((prev) => [
      ...prev,
      ...toAdd.map<AttachmentChip>((f) => ({
        id: crypto.randomUUID(),
        file: f,
        state: 'idle',
        retryCount: 0,
      })),
    ]);
  }

  function removeChip(id: string) {
    setChips((prev) => prev.filter((c) => c.id !== id));
  }

  function retryChip(id: string) {
    setChips((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, state: 'idle', retryCount: c.retryCount + 1 } : c
      )
    );
  }

  async function sendMessage(content: string) {
    if (!content.trim() && readyChips.length === 0) return;

    const userMessage: Message = { role: 'user', content };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInputValue('');
    setChips([]);
    setNetworkError(null);
    setIsLoading(true);
    setStreamingText('');

    const history = nextMessages
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content }));

    let response: Response;
    if (readyChips.length > 0) {
      const formData = new FormData();
      formData.append('content', content);
      formData.append('history', JSON.stringify(history));
      if (activeConversationId != null) {
        formData.append('conversationId', String(activeConversationId));
      }
      for (const chip of readyChips) {
        formData.append('files', chip.file, chip.file.name);
      }
      try {
        response = await postMultipart('/api/chat/message', formData);
      } catch {
        setNetworkError("Couldn't send this message. Try again.");
        setIsLoading(false);
        return;
      }
    } else {
      try {
        response = await post('/api/chat/message', {
          content,
          history,
          conversationId: activeConversationId,
        });
      } catch {
        setNetworkError("Couldn't send this message. Try again.");
        setIsLoading(false);
        return;
      }
    }

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      setNetworkError(data.error ?? "Couldn't send this message. Try again.");
      setIsLoading(false);
      return;
    }

    if (response.body == null) {
      setNetworkError("Couldn't send this message. Try again.");
      setIsLoading(false);
      return;
    }

    const handleSseToken = (data: string) => {
      const text = JSON.parse(data) as string;
      setStreamingText((prev) => prev + text);
    };

    const handleSseDone = (data: string) => {
      const result = JSON.parse(data) as ApiDonePayload;
      const assistantMessage: Message = {
        role: 'assistant',
        content: result.content,
        contentBefore: result.contentBefore,
        contentAfter: result.contentAfter,
        cards: result.cards,
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setStreamingText('');
      setMessagesUsedThisMonth((n) => n + 1);
      setActiveConversationId(result.conversationId);
      lastSavedDraftRef.current = '';
      const provisionalTitle =
        content.length > 60 ? `${content.slice(0, 60).trimEnd()}…` : content;
      onConversationCreated?.(result.conversationId, provisionalTitle);
      if (result.cards != null && result.cards.length > 0) {
        onCardsGenerated?.(result.cards);
      }
    };

    const handleSseError = (data: string) => {
      const err = JSON.parse(data) as ApiErrorPayload;
      if (err.type === 'rate_limit') {
        setLimitReached(true);
        if (err.resetDate != null) setResetDate(err.resetDate);
        return;
      }
      if (err.type === 'conversation_not_found') {
        setNetworkError('This conversation is gone. Start a new one.');
        setActiveConversationId(null);
        onConversationNotFound?.();
        return;
      }
      if (err.type === 'consent_required') {
        setShowConsentModal(true);
        return;
      }
      setNetworkError("Couldn't send this message. Try again.");
    };

    const dispatchSseEvent = (eventType: string, data: string) => {
      if (eventType === 'token') return handleSseToken(data);
      if (eventType === 'done') return handleSseDone(data);
      if (eventType === 'error') return handleSseError(data);
    };

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';

        for (const rawEvent of events) {
          const parsed = parseSseEvent(rawEvent);
          if (parsed != null) dispatchSseEvent(parsed.eventType, parsed.data);
        }
      }
    } catch {
      setNetworkError("Couldn't send this message. Try again.");
    } finally {
      setIsLoading(false);
      setStreamingText('');
    }
  }

  function handleSaveAsDeck(cards: ChatCard[], deckName: string) {
    downloadDeck(cards, deckName).catch(() => {
      setNetworkError("Couldn't generate the deck. Try again.");
    });
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        addFiles(files);
      }
    },
    [chips]
  ); // eslint-disable-line react-hooks/exhaustive-deps

  function handleChipClick(prefill: string) {
    setInputValue(prefill);
    setTimeout(() => {
      if (composerTextareaRef.current != null) {
        composerTextareaRef.current.focus();
        const len = composerTextareaRef.current.value.length;
        composerTextareaRef.current.setSelectionRange(len, len);
      }
    }, 0);
  }

  const isCardStreaming =
    /(?:^|\n)```json/.test(streamingText) ||
    /(?:^|\n)\s*\[\s*\{/.test(streamingText);

  const hasMessages = messages.length > 0;
  const showEmptyState = !hasMessages && !isLoading;

  return (
    <>
      {(showConsentModal || (!hasConsented && userLocals != null)) && (
        <ConsentModal
          onAccept={async () => {
            await refetchUserLocals();
            setShowConsentModal(false);
          }}
          onDismiss={() => setShowConsentModal(false)}
        />
      )}
      <div className={styles.container} data-hj-suppress>
        {showEmptyState ? (
          <div className={styles.emptyState}>
            <h1 className={styles.emptyHeading}>What are you studying?</h1>
            <p className={styles.emptySubhead}>
              {cameFromUpload
                ? "Tell me what's in your file — I'll help you get cards out of it."
                : 'Ask a question, paste your notes, or attach a PDF — get flashcards back.'}
            </p>
            {!cameFromUpload && (
              <div className={styles.starterChips}>
                {STARTER_CHIPS.map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    className={styles.starterChip}
                    onClick={() => handleChipClick(chip.prefill)}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className={styles.messageList} ref={messageListRef}>
            <div className={styles.messageListInner} aria-live="polite">
              {messages.map((m, i) => (
                <MessageBubble
                  key={i}
                  message={m}
                  expanded={expandedUserMessages.has(i)}
                  onToggleExpand={() => {
                    setExpandedUserMessages((prev) => {
                      const next = new Set(prev);
                      if (next.has(i)) {
                        next.delete(i);
                      } else {
                        next.add(i);
                      }
                      return next;
                    });
                  }}
                  onSave={handleSaveAsDeck}
                />
              ))}
              {isLoading && (
                <StreamingBubble
                  isLoading={isLoading}
                  streamingText={streamingText}
                  isCardStreaming={isCardStreaming}
                />
              )}
              <div ref={bottomRef} />
            </div>
          </div>
        )}

        <div className={styles.inputArea}>
          {limitReached && resetDate != null && (
            <div className={styles.limitPanel}>
              <span>
                You've used all {FREE_MONTHLY_LIMIT} messages this month. Resets{' '}
                {formatResetDate(resetDate)}.
              </span>
              <a href="/pricing" className={styles.limitPanelLink}>
                See plans
              </a>
            </div>
          )}
          <ComposerArea
            inputValue={inputValue}
            onChange={setInputValue}
            onSubmit={() => {
              if (canSend) sendMessage(inputValue);
            }}
            onAttach={addFiles}
            attachedFiles={chips}
            onRemoveFile={removeChip}
            onRetryFile={retryChip}
            disabled={isLoading || limitReached}
            isDragging={isDragging}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            textareaRef={composerTextareaRef}
          />
          {!isPatreon && !limitReached && messagesUsedThisMonth > 0 && (
            <p className={styles.usageLine}>
              {remainingMessages === 1
                ? '1 message left this month — your next send uses it'
                : `${remainingMessages} of ${FREE_MONTHLY_LIMIT} messages left this month`}
            </p>
          )}
          {networkError != null && (
            <p className={styles.networkError}>{networkError}</p>
          )}
        </div>
      </div>
    </>
  );
}
