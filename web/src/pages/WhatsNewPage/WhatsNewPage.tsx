import { FeedbackWidget } from '../../components/FeedbackWidget/FeedbackWidget';
import { changelog, ChangelogEntry } from './changelog/index';
import { inProgress } from './inProgress';
import { backlog } from './backlog';
import sharedStyles from '../../styles/shared.module.css';
import styles from './WhatsNewPage.module.css';

interface DateGroup {
  date: string;
  label: string;
  entries: ChangelogEntry[];
}

const TYPE_ORDER: Record<string, number> = { feature: 0, style: 1, fix: 2 };

const TYPE_LABELS: Record<string, string> = {
  feature: 'New',
  fix: 'Fix',
  style: 'Design',
};

function groupByDate(entries: ChangelogEntry[]): DateGroup[] {
  const map = new Map<string, ChangelogEntry[]>();
  for (const entry of entries) {
    const group = map.get(entry.date);
    if (group) {
      group.push(entry);
    } else {
      map.set(entry.date, [entry]);
    }
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, items]) => ({
      date,
      label: formatGroupDate(date),
      entries: items
        .slice()
        .sort((a, b) => (TYPE_ORDER[a.type] ?? 3) - (TYPE_ORDER[b.type] ?? 3)),
    }));
}

const formatGroupDate = (dateStr: string): string => {
  const date = new Date(dateStr + 'T00:00:00');
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

function daysAgo(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

function startedAgoLabel(iso: string): string {
  const days = daysAgo(iso);
  if (days === 0) return 'Started today';
  if (days === 1) return 'Started 1 day ago';
  return `Started ${days} days ago`;
}

export default function WhatsNewPage() {
  const shipped = groupByDate(changelog);

  return (
    <div className={sharedStyles.page}>
      <header className={sharedStyles.pageHeader}>
        <h1 className={sharedStyles.title}>What's new</h1>
        <p className={sharedStyles.subtitle}>
          What we've shipped, what we're working on, and what's next.
        </p>
        <div className={styles.inlineRating}>
          <span className={styles.ratingPrompt}>How&apos;s 2anki working for you?</span>
          <FeedbackWidget page="/whats-new" compact />
          <a
            href="https://github.com/2anki/server/issues/new"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.reportLink}
          >
            Report an issue →
          </a>
        </div>
      </header>

      <div className={styles.board}>
        <div className={`${styles.column} ${styles.columnShipped}`}>
          <h2 className={styles.columnHeader}>
            Shipped <span className={styles.columnCount}>· {changelog.length}</span>
          </h2>
          {shipped.length === 0 ? (
            <p className={styles.emptyState}>Nothing shipped yet.</p>
          ) : (
            <div className={styles.timeline}>
              {shipped.map((group) => (
                <div key={group.date} className={styles.dateGroup}>
                  <h3 className={styles.dateHeading}>{group.label}</h3>
                  <ul className={styles.commitList}>
                    {group.entries.map((entry, idx) => (
                      <li key={`${entry.date}-${idx}`} className={styles.commitItem}>
                        <span className={`${styles.typeBadge} ${styles['badge_' + entry.type]}`}>
                          {TYPE_LABELS[entry.type] ?? entry.type}
                        </span>
                        <span className={styles.commitText}>{entry.title}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.column}>
          <h2 className={styles.columnHeader}>
            In progress <span className={styles.columnCount}>· {inProgress.length}</span>
          </h2>
          {inProgress.length === 0 ? (
            <p className={styles.emptyState}>Nothing in flight.</p>
          ) : (
            <ul className={styles.cardList}>
              {inProgress.map((item, idx) => (
                <li key={`${item.startedAt}-${idx}`} className={styles.card}>
                  {item.type && (
                    <span className={styles.typeTag}>{item.type}</span>
                  )}
                  <span className={styles.cardTitle}>{item.title}</span>
                  <span className={styles.cardSecondary}>{startedAgoLabel(item.startedAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={styles.column}>
          <h2 className={styles.columnHeader}>
            Backlog <span className={styles.columnCount}>· {backlog.length}</span>
          </h2>
          {backlog.length === 0 ? (
            <p className={styles.emptyState}>Nothing queued.</p>
          ) : (
            <ul className={styles.cardList}>
              {backlog.map((item) => (
                <li key={item.issueUrl} className={styles.card}>
                  {item.type && (
                    <span className={styles.typeTag}>{item.type}</span>
                  )}
                  <span className={styles.cardTitle}>{item.title}</span>
                  {item.why && (
                    <span className={styles.cardSecondary}>{item.why}</span>
                  )}
                  <a
                    href={item.issueUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.trackedLink}
                  >
                    Tracked on GitHub →
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
