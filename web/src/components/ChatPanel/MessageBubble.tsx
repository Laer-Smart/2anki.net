import AssistantMarkdown from '../../pages/Chat/AssistantMarkdown';
import CardPreview from '../../pages/Chat/CardPreview';
import type { ChatCard, Message } from './ChatPanel';
import styles from './MessageBubble.module.css';

interface MessageBubbleProps {
  message: Message;
  expanded: boolean;
  onToggleExpand: () => void;
  onSave?: (cards: ChatCard[], deckName: string) => void;
}

function UserBubble({
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
    <div className={styles.messageUser} aria-label="User message">
      <div
        className={`${styles.messageBubbleUser} ${isLong ? styles.userBubbleCollapsible : ''} ${isLong && !expanded ? styles.userBubbleClamped : ''}`}
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

function AssistantBubble({
  message,
  onSave,
}: {
  message: Message;
  onSave?: (cards: ChatCard[], deckName: string) => void;
}) {
  return (
    <div className={styles.messageAssistant}>
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

export default function MessageBubble({
  message,
  expanded,
  onToggleExpand,
  onSave,
}: MessageBubbleProps) {
  if (message.role === 'user') {
    return (
      <UserBubble
        message={message}
        expanded={expanded}
        onToggleExpand={onToggleExpand}
      />
    );
  }
  return <AssistantBubble message={message} onSave={onSave} />;
}
