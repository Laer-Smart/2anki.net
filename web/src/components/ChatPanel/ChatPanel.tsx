import { useCallback, useEffect, useRef, useState } from 'react';
import { get, patch, post, postMultipart } from '../../lib/backend/api';
import { useUserLocals } from '../../lib/hooks/useUserLocals';
import ConsentModal from '../ConsentModal/ConsentModal';
import AssistantMarkdown from '../../pages/Chat/AssistantMarkdown';
import CardPreview from '../../pages/Chat/CardPreview';
import styles from './ChatPanel.module.css';

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

function visibleStreamingText(text: string): string {
  const fenceIndex = text.search(/(?:^|\n)```json/);
  if (fenceIndex !== -1) return text.slice(0, fenceIndex);
  const rawArrayIndex = text.search(/(?:^|\n)\s*\[\s*\{/);
  return rawArrayIndex === -1 ? text : text.slice(0, rawArrayIndex);
}

function chipIcon(mimeType: string): string {
  return mimeType === 'application/pdf' ? '📄' : '🖼';
}

function truncateName(name: string, max: number): string {
  if (name.length <= max) return name;
  const ext = name.lastIndexOf('.');
  if (ext > 0 && name.length - ext <= 6) {
    const truncated = name.slice(0, max - 3 - (name.length - ext));
    return `${truncated}…${name.slice(ext)}`;
  }
  return `${name.slice(0, max - 1)}…`;
}

function UserMessage({
  message,
  expanded,
  onToggleExpand,
}: {
  message: Message;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const isLong =
    message.content.length > 600 || message.content.split('\n').length > 12;
  return (
    <div className={styles.userRow} aria-label="User message">
      <div
        className={`${styles.userBubble} ${isLong && !expanded ? styles.userBubbleClamped : ''}`}
      >
        {message.content}
      </div>
      {isLong && (
        <button
          type="button"
          className={styles.expandToggle}
          onClick={onToggleExpand}
          aria-expanded={expanded}
        >
          {expanded ? 'Show less' : 'Show full message'}
        </button>
      )}
    </div>
  );
}

function AssistantMessage({
  message,
  onSave,
}: {
  message: Message;
  onSave?: (cards: ChatCard[], deckName: string) => void;
}) {
  return (
    <div className={styles.assistantRow}>
      {message.contentBefore != null && (
        <AssistantMarkdown>{message.contentBefore}</AssistantMarkdown>
      )}
      {message.cards != null && message.cards.length > 0 && onSave != null && (
        <CardPreview
          cards={message.cards}
          onSave={(deckName) => onSave(message.cards!, deckName)}
        />
      )}
      {message.contentAfter != null && (
        <AssistantMarkdown>{message.contentAfter}</AssistantMarkdown>
      )}
      {message.cards == null && (
        <AssistantMarkdown>{message.content}</AssistantMarkdown>
      )}
    </div>
  );
}

function StreamingMessage({
  streamingText,
  isCardStreaming,
}: {
  streamingText: string;
  isCardStreaming: boolean;
}) {
  if (streamingText.length > 0) {
    return (
      <div className={styles.assistantRow}>
        <AssistantMarkdown isStreaming={!isCardStreaming}>
          {visibleStreamingText(streamingText)}
        </AssistantMarkdown>
        {isCardStreaming && (
          <span className={styles.makingCards}>Making your cards</span>
        )}
      </div>
    );
  }

  return (
    <div className={styles.thinkingPill} aria-label="Thinking" role="status">
      <span className={styles.srOnly}>Thinking</span>
    </div>
  );
}

interface ComposerProps {
  inputValue: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onAttach: (files: File[]) => void;
  attachedFiles: AttachmentChip[];
  onRemoveFile: (id: string) => void;
  onRetryFile?: (id: string) => void;
  disabled: boolean;
  isDragging?: boolean;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
}

function ComposerPill({
  inputValue,
  onChange,
  onSubmit,
  onAttach,
  attachedFiles,
  onRemoveFile,
  onRetryFile,
  disabled,
  isDragging = false,
  onDragOver,
  onDragLeave,
  onDrop,
  textareaRef: externalTextareaRef,
}: ComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const internalRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = externalTextareaRef ?? internalRef;

  const hasContent =
    inputValue.trim().length > 0 ||
    attachedFiles.filter((c) => c.state === 'idle').length > 0;
  const canSend = hasContent && !disabled;

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Escape') {
      e.currentTarget.blur();
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (canSend) {
        onSubmit();
      }
    }
  }

  return (
    <div
      role="region"
      aria-label="Chat composer with file drop zone"
      className={`${styles.composerPill} ${isDragging ? styles.composerPillDragging : ''}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {isDragging && (
        <div className={styles.dropOverlay}>
          <span className={styles.dropOverlayTitle}>Drop to attach</span>
          <span className={styles.dropOverlaySub}>
            PDF or image, up to 10 MB each
          </span>
        </div>
      )}
      {attachedFiles.length > 0 && (
        <div className={styles.chipStrip}>
          {attachedFiles.map((chip) => (
            <div
              key={chip.id}
              className={`${styles.chip} ${chip.state === 'failed' ? styles.chipError : ''}`}
            >
              <span className={styles.chipIcon}>
                {chipIcon(chip.file.type)}
              </span>
              <span className={styles.chipName} title={chip.file.name}>
                {truncateName(chip.file.name, 32)}
              </span>
              <span className={styles.chipSeparator}> · </span>
              {chip.state === 'uploading' && (
                <>
                  <span
                    className={`${styles.chipSize} ${styles.chipSizeError}`}
                  >
                    <span className={styles.spinnerSmall} />
                  </span>
                  <span className={styles.chipSize}>Uploading</span>
                </>
              )}
              {chip.state === 'failed' && (
                <>
                  <span
                    className={`${styles.chipSize} ${styles.chipSizeError}`}
                  >
                    Upload failed
                  </span>
                  {onRetryFile != null && (
                    <button
                      type="button"
                      className={styles.chipRetry}
                      onClick={() => onRetryFile(chip.id)}
                    >
                      Retry
                    </button>
                  )}
                </>
              )}
              {chip.state === 'idle' && (
                <span className={styles.chipSize}>
                  {formatFileSize(chip.file.size)}
                </span>
              )}
              <button
                type="button"
                className={styles.chipRemove}
                aria-label={`Remove ${chip.file.name}`}
                onClick={() => onRemoveFile(chip.id)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <div className={styles.composerRow}>
        <button
          type="button"
          className={styles.attachBtn}
          aria-label="Attach files"
          disabled={disabled || attachedFiles.length >= MAX_FILE_COUNT}
          onClick={() => fileInputRef.current?.click()}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
        <textarea
          ref={textareaRef}
          className={styles.textarea}
          value={inputValue}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What are you studying?"
          disabled={disabled}
          rows={1}
          aria-label="Message input"
        />
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="application/pdf,image/png,image/jpeg,image/gif,image/webp"
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files != null && e.target.files.length > 0) {
              onAttach(Array.from(e.target.files));
            }
            e.target.value = '';
          }}
          aria-hidden="true"
          tabIndex={-1}
        />
        <button
          type="button"
          className={`${styles.sendBtn} ${canSend ? styles.sendBtnActive : ''}`}
          onClick={onSubmit}
          disabled={!canSend}
          aria-label="Send message"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="12" y1="19" x2="12" y2="5" />
            <polyline points="5 12 12 5 19 12" />
          </svg>
        </button>
      </div>
    </div>
  );
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
  const [userScrolledAway, setUserScrolledAway] = useState(false);

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
      setUserScrolledAway(false);
    }
  }, [messages, isLoading, streamingText]);

  useEffect(() => {
    const el = messageListRef.current;
    if (el == null) return;

    function handleScroll() {
      if (el == null) return;
      const distanceFromBottom =
        el.scrollHeight - el.scrollTop - el.clientHeight;
      setUserScrolledAway(distanceFromBottom > 80);
    }

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

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
    setUserScrolledAway(false);

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
    [chips] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const isCardStreaming =
    /(?:^|\n)```json/.test(streamingText) ||
    /(?:^|\n)\s*\[\s*\{/.test(streamingText);

  const hasMessages = messages.length > 0;
  const showEmptyState = !hasMessages && !isLoading;

  const composerProps: ComposerProps = {
    inputValue,
    onChange: setInputValue,
    onSubmit: () => {
      if (canSend) sendMessage(inputValue);
    },
    onAttach: addFiles,
    attachedFiles: chips,
    onRemoveFile: removeChip,
    onRetryFile: retryChip,
    disabled: isLoading || limitReached,
    isDragging,
    onDragOver: handleDragOver,
    onDragLeave: handleDragLeave,
    onDrop: handleDrop,
    textareaRef: composerTextareaRef,
  };

  function scrollToBottom() {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    setUserScrolledAway(false);
  }

  const showScrollPill = userScrolledAway && isLoading;

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
            <h1 className={styles.emptyHeading}>
              {cameFromUpload
                ? 'What would you like to do with this file?'
                : 'What are you studying?'}
            </h1>
            <div className={styles.emptyComposer}>
              <ComposerPill {...composerProps} />
              {networkError != null && (
                <p className={styles.networkError}>{networkError}</p>
              )}
              {!isPatreon && !limitReached && messagesUsedThisMonth > 0 && (
                <p className={styles.usageLine}>
                  {remainingMessages === 1
                    ? '1 message left this month — your next send uses it'
                    : `${remainingMessages} of ${FREE_MONTHLY_LIMIT} messages left this month`}
                </p>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className={styles.messageList} ref={messageListRef}>
              <div
                className={styles.messageListInner}
                aria-live="polite"
              >
                {messages.map((m, i) => {
                  if (m.role === 'user') {
                    return (
                      <UserMessage
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
                      />
                    );
                  }
                  return (
                    <AssistantMessage
                      key={i}
                      message={m}
                      onSave={handleSaveAsDeck}
                    />
                  );
                })}
                {isLoading && (
                  <StreamingMessage
                    streamingText={streamingText}
                    isCardStreaming={isCardStreaming}
                  />
                )}
                <div ref={bottomRef} />
              </div>
            </div>

            {showScrollPill && (
              <div className={styles.scrollPillWrapper}>
                <button
                  type="button"
                  className={styles.scrollPill}
                  aria-label="Scroll to bottom"
                  onClick={scrollToBottom}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <polyline points="19 12 12 19 5 12" />
                  </svg>
                </button>
              </div>
            )}

            <div className={styles.inputArea}>
              {limitReached && resetDate != null && (
                <div className={styles.limitPanel}>
                  <span>
                    You've used all {FREE_MONTHLY_LIMIT} messages this month.
                    Resets {formatResetDate(resetDate)}.
                  </span>
                  <a href="/pricing" className={styles.limitPanelLink}>
                    See plans
                  </a>
                </div>
              )}
              <ComposerPill {...composerProps} />
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
          </>
        )}
      </div>
    </>
  );
}
