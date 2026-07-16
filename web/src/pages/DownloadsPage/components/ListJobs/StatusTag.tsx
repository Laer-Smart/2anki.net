import { useTranslation } from 'react-i18next';
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

function getStatusKey(status: JobStatus): string {
  switch (status) {
    case 'started':
      return 'status.queued';
    case 'step1_create_workspace':
    case 'step2_creating_flashcards':
    case 'step3_building_deck':
      return 'status.inProgress';
    case 'done':
      return 'status.done';
    case 'interrupted':
      return 'status.interrupted';
    case 'stale':
      return 'status.stuck';
    case 'failed':
      return 'status.failed';
    case 'cancelled':
      return 'status.cancelled';
    default:
      return 'status.inProgress';
  }
}

export function StatusTag({ status }: Prop) {
  const { t } = useTranslation();
  const { className, dotClassName } = getStatusStyle(status);
  const chunk = parseClaudeChunk(status);
  const displayText = chunk
    ? t('status.generating', { current: chunk.current, total: chunk.total })
    : t(getStatusKey(status));

  return (
    <span className={`${listStyles.status} ${className}`}>
      <span className={`${listStyles.statusDot} ${dotClassName}`} />
      {displayText}
    </span>
  );
}
