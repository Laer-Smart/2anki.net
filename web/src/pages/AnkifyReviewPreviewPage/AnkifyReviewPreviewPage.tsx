import { ReactNode } from 'react';

import {
  DeckPicker,
  Reviewer,
  ReviewSummary,
} from '../AnkifyPage/components/ReviewPanel';
import reviewStyles from '../AnkifyPage/components/ReviewPanel.module.css';
import { ReviewQueueCard } from '../../lib/backend/Backend';
import { AnkifyStatsDeck } from '../AnkifyPage/stats/types';

const decksWithDue: AnkifyStatsDeck[] = [
  {
    name: 'Notion Sync::Pharmacology',
    new: 12,
    learning: 3,
    review: 47,
    total: 420,
  },
  { name: 'Notion Sync::Torts', new: 0, learning: 1, review: 8, total: 90 },
];

const decksCaughtUp: AnkifyStatsDeck[] = [
  {
    name: 'Notion Sync::Pharmacology',
    new: 0,
    learning: 0,
    review: 0,
    total: 420,
  },
  { name: 'Notion Sync::Torts', new: 0, learning: 0, review: 0, total: 90 },
];

const previewCard: ReviewQueueCard = {
  cardId: 9001,
  questionHtml: '<p>What is the half-life of caffeine?</p>',
  answerHtml: '<p>About 5 hours.</p>',
  css: '.card { font-family: sans-serif; text-align: center; }',
};

const cell = (label: string, node: ReactNode) => (
  <div className={reviewStyles.previewCell}>
    <p className={reviewStyles.previewLabel}>{label}</p>
    {node}
  </div>
);

export default function AnkifyReviewPreviewPage() {
  return (
    <div className={reviewStyles.preview}>
      {cell(
        'Picker — decks due',
        <DeckPicker decks={decksWithDue} onReview={() => {}} />
      )}
      {cell(
        'Picker — all caught up',
        <DeckPicker decks={decksCaughtUp} onReview={() => {}} />
      )}
      {cell(
        'Reviewer — front',
        <Reviewer
          cardIds={[previewCard.cardId]}
          deckName="Notion Sync::Pharmacology"
          loadCard={async () => ({ connected: true, card: previewCard })}
          onGrade={async () => {}}
          onDone={() => {}}
          onExit={() => {}}
        />
      )}
      {cell('Reviewer — done', <ReviewSummary graded={47} onBack={() => {}} />)}
      {cell(
        'Reviewer — offline',
        <p style={{ color: 'var(--color-text-tertiary)' }}>
          Anki isn&apos;t connected.
        </p>
      )}
    </div>
  );
}
