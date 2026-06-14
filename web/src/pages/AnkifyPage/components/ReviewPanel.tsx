import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import styles from '../AnkifyPage.module.css';
import reviewStyles from './ReviewPanel.module.css';
import sharedStyles from '../../../styles/shared.module.css';
import { get2ankiApi } from '../../../lib/backend/get2ankiApi';
import { Backend, ReviewQueueCard } from '../../../lib/backend/Backend';
import { AnkifyStatsDeck } from '../stats/types';
import { track } from '../../../lib/analytics/track';

interface Props {
  readonly backend?: Backend;
}

const EASE_BY_KEY: Record<string, number> = { '1': 1, '2': 2, '3': 3, '4': 4 };

const GRADES = [
  {
    ease: 1,
    label: 'Again',
    interval: '<1m',
    className: reviewStyles.gradeAgain,
  },
  {
    ease: 2,
    label: 'Hard',
    interval: '<6m',
    className: reviewStyles.gradeHard,
  },
  { ease: 3, label: 'Good', interval: '1d', className: reviewStyles.gradeGood },
  { ease: 4, label: 'Easy', interval: '4d', className: reviewStyles.gradeEasy },
];

export function DeckPicker({
  decks,
  onReview,
}: {
  readonly decks: AnkifyStatsDeck[];
  readonly onReview: (deckName: string) => void;
}) {
  return (
    <ul className={styles.decksList}>
      {decks.map((deck) => {
        const due = deck.review;
        const muted = due === 0;
        return (
          <li
            key={deck.name}
            className={
              muted
                ? `${styles.decksItem} ${reviewStyles.deckRowMuted}`
                : styles.decksItem
            }
          >
            <span className={styles.decksItemTitle} title={deck.name}>
              {deck.name}
            </span>
            <span className={reviewStyles.deckCounts}>
              <span className={reviewStyles.deckDue}>
                <span aria-hidden="true">▲</span>
                {due} due
              </span>
              <span>{deck.learning} learning</span>
              <span>+{deck.new} new</span>
            </span>
            <button
              type="button"
              className={reviewStyles.deckReview}
              disabled={muted}
              onClick={() => onReview(deck.name)}
            >
              Review
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function Reviewer({
  cards,
  deckName,
  onGrade,
  onDone,
}: {
  readonly cards: ReviewQueueCard[];
  readonly deckName: string;
  readonly onGrade: (cardId: number, ease: number) => Promise<void>;
  readonly onDone: (graded: number) => void;
}) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<
    { index: number; revealed: boolean }[]
  >([]);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!startedRef.current && cards.length > 0) {
      startedRef.current = true;
      track('ankify_review_session_started', { deck: deckName });
    }
  }, [cards.length, deckName]);

  const total = cards.length;
  const current = cards[index];

  const reveal = useCallback(() => setRevealed(true), []);

  const grade = useCallback(
    async (ease: number) => {
      if (current == null || busy) {
        return;
      }
      setBusy(true);
      try {
        await onGrade(current.cardId, ease);
        setHistory((prev) => [...prev, { index, revealed: true }]);
        const next = index + 1;
        if (next >= total) {
          track('ankify_review_completed', { deck: deckName, graded: total });
          onDone(total);
          return;
        }
        setIndex(next);
        setRevealed(false);
      } finally {
        setBusy(false);
      }
    },
    [busy, current, deckName, index, onDone, onGrade, total]
  );

  const undo = useCallback(() => {
    setHistory((prev) => {
      if (prev.length === 0) {
        return prev;
      }
      const last = prev[prev.length - 1];
      setIndex(last.index);
      setRevealed(true);
      return prev.slice(0, -1);
    });
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === ' ') {
        event.preventDefault();
        if (revealed) {
          return;
        }
        reveal();
        return;
      }
      if (revealed && EASE_BY_KEY[event.key] != null) {
        event.preventDefault();
        grade(EASE_BY_KEY[event.key]);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [grade, reveal, revealed]);

  if (current == null) {
    return null;
  }

  const srcDoc = `<!doctype html><html><head><meta charset="utf-8"><style>${current.css}</style></head><body class="card">${revealed ? current.answerHtml : current.questionHtml}</body></html>`;

  return (
    <div>
      <div className={reviewStyles.progressTrack}>
        <span
          className={reviewStyles.progressFill}
          style={{ width: `${(index / total) * 100}%` }}
        />
      </div>
      <p className={reviewStyles.progressLabel}>
        {index + 1} / {total}
      </p>
      <div className={reviewStyles.cardArea}>
        <iframe
          title="Card preview"
          className={reviewStyles.cardFrame}
          sandbox="allow-scripts"
          srcDoc={srcDoc}
        />
        {revealed ? (
          <>
            <hr className={reviewStyles.cardDivider} />
            <div className={reviewStyles.grades}>
              {GRADES.map((g) => (
                <button
                  key={g.ease}
                  type="button"
                  className={`${reviewStyles.gradeButton} ${g.className}`}
                  disabled={busy}
                  onClick={() => grade(g.ease)}
                >
                  {g.label}
                  <span
                    className={reviewStyles.gradeInterval}
                    aria-hidden="true"
                  >
                    <span className={reviewStyles.gradeShortcut}>{g.ease}</span>{' '}
                    {g.interval}
                  </span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <button
            type="button"
            className={reviewStyles.showAnswer}
            onClick={reveal}
          >
            Show answer
            <span className={reviewStyles.shortcutHint} aria-hidden="true">
              Space
            </span>
          </button>
        )}
        {history.length > 0 && (
          <div className={reviewStyles.undoBar}>
            <button
              type="button"
              className={reviewStyles.undoButton}
              onClick={undo}
              disabled={busy}
            >
              Undo last grade
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function ReviewSummary({
  graded,
  onBack,
}: {
  readonly graded: number;
  readonly onBack: () => void;
}) {
  return (
    <div className={reviewStyles.summary}>
      <p className={reviewStyles.summaryHeadline}>
        {graded} card{graded === 1 ? '' : 's'}. Done.
      </p>
      <div className={reviewStyles.summaryActions}>
        <button
          type="button"
          className={sharedStyles.btnGhost}
          onClick={onBack}
        >
          Back to decks
        </button>
      </div>
    </div>
  );
}

type Stage =
  | { kind: 'picker' }
  | { kind: 'reviewing'; deck: string }
  | { kind: 'summary'; deck: string; graded: number };

export default function ReviewPanel({ backend }: Props) {
  const api = backend ?? get2ankiApi();
  const [stage, setStage] = useState<Stage>({ kind: 'picker' });

  const stats = useQuery({
    queryKey: ['ankify-review-stats'],
    queryFn: () => api.getAnkifyStats(),
  });

  const queue = useQuery({
    queryKey: [
      'ankify-review-queue',
      stage.kind === 'reviewing' ? stage.deck : null,
    ],
    queryFn: () =>
      stage.kind === 'reviewing'
        ? api.getAnkifyReviewQueue(stage.deck)
        : Promise.resolve({ connected: false, cards: [] }),
    enabled: stage.kind === 'reviewing',
  });

  const grade = useCallback(
    (cardId: number, ease: number) => api.gradeAnkifyReviewCard(cardId, ease),
    [api]
  );

  const panel = (children: ReactNode) => (
    <div
      role="tabpanel"
      id="ankify-tabpanel-review"
      aria-labelledby="ankify-tab-review"
      className={styles.tabPanel}
    >
      {children}
    </div>
  );

  if (stage.kind === 'summary') {
    return panel(
      <ReviewSummary
        graded={stage.graded}
        onBack={() => setStage({ kind: 'picker' })}
      />
    );
  }

  if (stage.kind === 'reviewing') {
    if (queue.isLoading) {
      return panel(<p className={styles.emptyLine}>Loading your cards.</p>);
    }
    if (queue.data?.connected !== true) {
      return panel(
        <p className={styles.emptyLine}>Anki isn&apos;t connected.</p>
      );
    }
    if (queue.data.cards.length === 0) {
      return panel(<p className={styles.emptyLine}>All caught up.</p>);
    }
    return panel(
      <Reviewer
        cards={queue.data.cards}
        deckName={stage.deck}
        onGrade={grade}
        onDone={(graded) =>
          setStage({ kind: 'summary', deck: stage.deck, graded })
        }
      />
    );
  }

  if (stats.isLoading) {
    return panel(<p className={styles.emptyLine}>Loading your cards.</p>);
  }
  if (stats.data?.connected !== true) {
    return panel(
      <p className={styles.emptyLine}>Anki isn&apos;t connected.</p>
    );
  }
  if (stats.data.decks.length === 0) {
    return panel(<p className={styles.emptyLine}>All caught up.</p>);
  }

  return panel(
    <>
      <p className={styles.decksHelper}>
        Pick a deck to review its due cards without opening Anki.
      </p>
      <DeckPicker
        decks={stats.data.decks}
        onReview={(deck) => setStage({ kind: 'reviewing', deck })}
      />
    </>
  );
}
