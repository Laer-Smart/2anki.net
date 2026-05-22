import { useEffect, useRef, useState } from 'react';
import DownloadIcon from '../../components/icons/DownloadIcon';
import styles from './CardPreview.module.css';

interface ChatCard {
  front: string;
  back: string;
}

interface CardPreviewProps {
  cards: ChatCard[];
  onSave: (deckName: string) => void;
}

type SaveState = 'idle' | 'naming' | 'saved';

const VISIBLE_COUNT = 5;
const MAX_DECK_NAME_LENGTH = 120;
const FILENAME_FORBIDDEN = /[/\\:*?"<>|]/g;

function sanitizeFilename(name: string): string {
  return name
    .replace(FILENAME_FORBIDDEN, '-')
    .replace(/^[.\s]+|[.\s]+$/g, '')
    .slice(0, MAX_DECK_NAME_LENGTH);
}

export default function CardPreview({ cards, onSave }: CardPreviewProps) {
  const [expanded, setExpanded] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [deckNameDraft, setDeckNameDraft] = useState('Untitled deck');
  const [savedName, setSavedName] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (saveState === 'naming' && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [saveState]);

  const visibleCards = expanded ? cards : cards.slice(0, VISIBLE_COUNT);
  const hasMore = cards.length > VISIBLE_COUNT;

  function openNaming() {
    setSaveState('naming');
    setShowHint(true);
  }

  function cancelNaming() {
    setSaveState(savedName == null ? 'idle' : 'saved');
  }

  function commitSave() {
    const sanitized = sanitizeFilename(deckNameDraft.trim());
    if (sanitized.length === 0) return;
    setSavedName(sanitized);
    setSaveState('saved');
    onSave(sanitized);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      commitSave();
    } else if (e.key === 'Escape') {
      cancelNaming();
    }
  }

  const cardLabel = cards.length === 1 ? 'card' : 'cards';

  return (
    <div className={styles.cardPreview}>
      <div className={styles.cardPreviewHeader}>
        <span className={styles.cardPreviewCount}>
          <span className={styles.cardPreviewCountNumber}>{cards.length}</span>{' '}
          {cardLabel}
        </span>

        {saveState === 'idle' && (
          <button
            type="button"
            className={styles.cardPreviewSave}
            aria-label="Download deck"
            onClick={openNaming}
          >
            <DownloadIcon width={13} height={13} />
            Download deck
          </button>
        )}

        {saveState === 'naming' && (
          <div className={styles.renameRow}>
            <input
              ref={inputRef}
              type="text"
              className={styles.renameInput}
              value={deckNameDraft}
              onChange={(e) => setDeckNameDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={MAX_DECK_NAME_LENGTH}
              placeholder="Name this deck"
              aria-label="Deck name"
            />
            <button
              type="button"
              className={styles.renameSave}
              onClick={commitSave}
              disabled={deckNameDraft.trim().length === 0}
            >
              Save
            </button>
            <button
              type="button"
              className={styles.renameCancel}
              onClick={cancelNaming}
            >
              Cancel
            </button>
            {showHint && (
              <p className={styles.renameHint}>
                {cards.length} {cardLabel}. Saves as{' '}
                {sanitizeFilename(deckNameDraft.trim()) || 'Untitled deck'}.apkg
                once you click Save.
              </p>
            )}
          </div>
        )}

        {saveState === 'saved' && savedName != null && (
          <div className={styles.savedLine}>
            <span className={styles.savedFile}>Saved as {savedName}.apkg</span>
            <button
              type="button"
              className={styles.savedAgainBtn}
              onClick={openNaming}
            >
              Save again
            </button>
          </div>
        )}
      </div>

      <div className={styles.cardPreviewColumnLabels}>
        <span>Front</span>
        <span>Back</span>
      </div>

      <div className={styles.cardPreviewList}>
        {visibleCards.map((card, i) => (
          <div key={i} className={styles.cardPreviewRow}>
            <div className={styles.cardPreviewFront}>
              <span className={styles.cardPreviewMobileLabel}>Front</span>
              {card.front}
            </div>
            <div className={styles.cardPreviewBack}>
              <span className={styles.cardPreviewMobileLabel}>Back</span>
              {card.back}
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <button
          type="button"
          className={styles.cardPreviewExpandBtn}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? 'Show fewer' : `Show all ${cards.length} cards`}
        </button>
      )}
    </div>
  );
}
