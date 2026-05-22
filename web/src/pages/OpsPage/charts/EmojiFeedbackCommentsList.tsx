import { EmojiFeedbackCommentPoint } from '../businessTypes';
import styles from '../OpsPage.module.css';

const EMOJI_LABELS: Record<number, string> = {
  1: '\u{1F621}',
  2: '\u{1F928}',
  5: '\u{1F60D}',
};

interface EmojiFeedbackCommentsListProps {
  points: EmojiFeedbackCommentPoint[];
}

const formatDate = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
};

export default function EmojiFeedbackCommentsList({
  points,
}: Readonly<EmojiFeedbackCommentsListProps>) {
  return (
    <ul className={styles.commentList}>
      {points.map((point, idx) => (
        <li key={`${point.created_at}-${idx}`} className={styles.commentItem}>
          <div className={styles.commentMeta}>
            <span className={styles.commentReason}>
              {EMOJI_LABELS[point.rating] ?? point.rating} {point.page}
            </span>
            <span className={styles.commentDate}>
              {formatDate(point.created_at)}
            </span>
          </div>
          <p className={styles.commentBody}>{point.comment}</p>
        </li>
      ))}
    </ul>
  );
}
