import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';

import sharedStyles from '../../../styles/shared.module.css';
import styles from './StudyStatsSection.module.css';
import { Backend } from '../../../lib/backend/Backend';
import { useAnkifyStats } from './useAnkifyStats';
import ReviewStreakHeatmap from './ReviewStreakHeatmap';
import DeckBreakdownChart from './DeckBreakdownChart';
import { AnkifyStatsConnected } from './types';

const THIN_SPACE = ' ';

const formatCount = (value: number): string => {
  if (value < 10000) {
    return String(value);
  }
  return value.toLocaleString('en-US').replace(/,/g, THIN_SPACE);
};

const todayDayKey = (): string => new Date().toISOString().slice(0, 10);

const dailyAverage = (stats: AnkifyStatsConnected): number => {
  const studied = stats.reviewsByDay.filter((entry) => entry.count > 0);
  if (studied.length === 0) {
    return 0;
  }
  const total = studied.reduce((sum, entry) => sum + entry.count, 0);
  return Math.round(total / studied.length);
};

interface SummaryStat {
  value: number;
  label: string;
}

function SummaryLine({ stats }: Readonly<{ stats: SummaryStat[] }>) {
  return (
    <p className={styles.summary}>
      {stats.map((stat, index) => (
        <Fragment key={stat.label}>
          {index > 0 && <span className={styles.summarySeparator}>·</span>}
          <span className={styles.summaryStat}>
            <span className={styles.summaryValue}>
              {formatCount(stat.value)}
            </span>
            <span className={styles.summaryLabel}>{stat.label}</span>
          </span>
        </Fragment>
      ))}
    </p>
  );
}

function SectionShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const { t } = useTranslation('ankify');
  return (
    <section className={`${sharedStyles.surface} ${styles.section}`}>
      <div className={sharedStyles.surfaceHeaderText}>
        <h2 className={sharedStyles.surfaceTitle}>{t('stats.yourReviews')}</h2>
        <p className={sharedStyles.surfaceLead}>{t('stats.liveFromAnki')}</p>
      </div>
      {children}
    </section>
  );
}

function ConnectedStats({ stats }: Readonly<{ stats: AnkifyStatsConnected }>) {
  const { t } = useTranslation('ankify');
  const today = todayDayKey();
  const hasReviews = stats.reviewsByDay.some((entry) => entry.count > 0);
  const summary: SummaryStat[] = [
    { value: stats.currentStreak, label: t('stats.dayStreak') },
    { value: dailyAverage(stats), label: t('stats.dailyAverage') },
    { value: stats.reviewedThisYear, label: t('stats.reviewsThisYear') },
  ];
  return (
    <>
      <div className={styles.activityBlock}>
        <SummaryLine stats={summary} />
        <ReviewStreakHeatmap
          reviewsByDay={stats.reviewsByDay}
          today={today}
          currentStreak={stats.currentStreak}
          reviewsThisYear={stats.reviewedThisYear}
        />
        {!hasReviews && (
          <p className={styles.stateText}>{t('stats.noReviews')}</p>
        )}
      </div>
      <div className={sharedStyles.surfaceDivider} />
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
  const { t } = useTranslation('ankify');
  const { data, isLoading } = useAnkifyStats(backend);

  if (isLoading || data == null) {
    return (
      <SectionShell>
        <p className={styles.stateText}>{t('stats.reading')}</p>
      </SectionShell>
    );
  }

  if (!data.connected) {
    return (
      <SectionShell>
        <p className={styles.stateText}>{t('stats.notConnected')}</p>
      </SectionShell>
    );
  }

  return (
    <SectionShell>
      <ConnectedStats stats={data} />
    </SectionShell>
  );
}
