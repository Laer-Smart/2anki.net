import AssistantMarkdown from '../../pages/Chat/AssistantMarkdown';
import styles from './StreamingBubble.module.css';

function visibleStreamingText(text: string): string {
  const fenceIndex = text.search(/(?:^|\n)```json/);
  if (fenceIndex !== -1) return text.slice(0, fenceIndex);
  const rawArrayIndex = text.search(/(?:^|\n)\s*\[\s*\{/);
  return rawArrayIndex === -1 ? text : text.slice(0, rawArrayIndex);
}

interface StreamingBubbleProps {
  isLoading: boolean;
  streamingText: string;
  isCardStreaming: boolean;
}

export default function StreamingBubble({
  isLoading,
  streamingText,
  isCardStreaming,
}: StreamingBubbleProps) {
  if (!isLoading) return null;

  if (streamingText.length > 0) {
    return (
      <div className={styles.streamingAssistant}>
        <AssistantMarkdown isStreaming={!isCardStreaming}>
          {visibleStreamingText(streamingText)}
        </AssistantMarkdown>
        <span className={styles.streamingCaret} aria-hidden="true">
          |
        </span>
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
