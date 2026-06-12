import sharedStyles from '../../../styles/shared.module.css';
import styles from './StudyStatsSection.module.css';
import { Backend } from '../../../lib/backend/Backend';
import { useAnkifyStats } from './useAnkifyStats';
import ReviewStreakHeatmap from './ReviewStreakHeatmap';
import DeckBreakdownChart from './DeckBreakdownChart';
import { AnkifyStatsConnected } from './types';

const THIN_SPACE = ' ';

const formatCount = (value: number): string => {
  if (value < 10000) {
    return String(value);
  }
  return value.toLocaleString('en-US').replace(/,/g, THIN_SPACE);
};

const todayDayKey = (): string => new Date().toISOString().slice(0, 10);

interface HeroProps {
  value: number;
  label: string;
}

function Hero({ value, label }: Readonly<HeroProps>) {
  return (
    <div className={styles.hero}>
      <span className={styles.heroValue}>{formatCount(value)}</span>
      <span className={styles.heroLabel}>{label}</span>
    </div>
  );
}

function SectionShell({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <section className={`${sharedStyles.surface} ${styles.section}`}>
      <div className={sharedStyles.surfaceHeaderText}>
        <h2 className={sharedStyles.surfaceTitle}>Your reviews</h2>
        <p className={sharedStyles.surfaceLead}>Live from Anki.</p>
      </div>
      {children}
    </section>
  );
}

function ConnectedStats({ stats }: Readonly<{ stats: AnkifyStatsConnected }>) {
  const today = todayDayKey();
  const hasReviews = stats.reviewsByDay.some((entry) => entry.count > 0);
  return (
    <>
      <div className={styles.heroRow}>
        <Hero value={stats.reviewedToday} label="reviewed today" />
        <Hero value={stats.currentStreak} label="day streak" />
        <Hero value={stats.reviewedThisYear} label="reviewed this year" />
      </div>
      <div className={styles.heatmapWrap}>
        <ReviewStreakHeatmap reviewsByDay={stats.reviewsByDay} today={today} />
        {!hasReviews && (
          <p className={styles.stateText}>
            No reviews yet. Open Anki and study a deck — your streak starts on
            day one.
          </p>
        )}
      </div>
      <DeckBreakdownChart decks={stats.decks} />
    </>
  );
}

interface StudyStatsSectionProps {
  backend: Backend;
}

export default function StudyStatsSection({
  backend,
}: Readonly<StudyStatsSectionProps>) {
  const { data, isLoading } = useAnkifyStats(backend);

  if (isLoading || data == null) {
    return (
      <SectionShell>
        <p className={styles.stateText}>Reading your stats from Anki</p>
      </SectionShell>
    );
  }

  if (!data.connected) {
    return (
      <SectionShell>
        <p className={styles.stateText}>
          Anki isn&apos;t connected right now. Your stats will load when it
          reconnects — usually within a few minutes.
        </p>
      </SectionShell>
    );
  }

  return (
    <SectionShell>
      <ConnectedStats stats={data} />
    </SectionShell>
  );
}
