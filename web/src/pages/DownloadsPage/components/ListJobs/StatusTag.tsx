import listStyles from './ListJobs.module.css';
import styles from '../../../../styles/shared.module.css';

export type JobStatus =
  | 'started'
  | 'step1_create_workspace'
  | 'step2_creating_flashcards'
  | 'step3_building_deck'
  | 'stale'
  | 'interrupted'
  | 'failed'
  | 'cancelled'
  | 'done';

interface Prop {
  readonly status: JobStatus;
}

function parseClaudeChunk(
  status: string
): { current: number; total: number } | null {
  const match = /^claude:chunk:(\d+):(\d+)$/.exec(status);
  if (!match) return null;
  return { current: Number(match[1]), total: Number(match[2]) };
}

function getStatusStyle(status: JobStatus): {
  className: string;
  dotClassName: string;
} {
  if (parseClaudeChunk(status)) {
    return { className: listStyles.statusInfo, dotClassName: styles.dotInfo };
  }
  switch (status) {
    case 'started':
    case 'step1_create_workspace':
    case 'step2_creating_flashcards':
    case 'step3_building_deck':
    case 'done':
      return { className: listStyles.statusInfo, dotClassName: styles.dotInfo };
    case 'interrupted':
    case 'failed':
    case 'cancelled':
      return {
        className: listStyles.statusDanger,
        dotClassName: styles.dotDanger,
      };
    default:
      return {
        className: listStyles.statusWarning,
        dotClassName: styles.dotWarning,
      };
  }
}

function getStatusText(status: JobStatus): string {
  const chunk = parseClaudeChunk(status);
  if (chunk) return `Generating flashcards (${chunk.current} / ${chunk.total})`;
  switch (status) {
    case 'started':
      return 'Queued';
    case 'step1_create_workspace':
    case 'step2_creating_flashcards':
    case 'step3_building_deck':
      return 'In Progress';
    case 'done':
      return 'Done';
    case 'interrupted':
      return 'Interrupted';
    case 'stale':
      return 'Stuck';
    case 'failed':
      return 'Failed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return 'In Progress';
  }
}

export function StatusTag({ status }: Prop) {
  const { className, dotClassName } = getStatusStyle(status);
  const displayText = getStatusText(status);

  return (
    <span className={`${listStyles.status} ${className}`}>
      <span className={`${listStyles.statusDot} ${dotClassName}`} />
      {displayText}
    </span>
  );
}
