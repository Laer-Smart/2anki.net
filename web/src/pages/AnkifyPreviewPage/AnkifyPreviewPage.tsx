import { ReactElement, useState } from 'react';
import styles from './AnkifyPreviewPage.module.css';
import SwissPanelDeckList, { SwissPanelDeck } from './SwissPanelDeckList';
import ReviewStreakHeatmap from '../AnkifyPage/stats/ReviewStreakHeatmap';
import DeckBreakdownChart from '../AnkifyPage/stats/DeckBreakdownChart';
import ExternalLinkIcon from '../../components/icons/ExternalLinkIcon';
import RefreshIcon from '../../components/icons/RefreshIcon';
import ArrowRightOnRectangleIcon from '../../components/icons/ArrowRightOnRectangleIcon';
import DotsHorizontal from '../../components/icons/DotsHorizontal';
import {
  AnkifyStatsDeck,
  AnkifyStatsReviewDay,
} from '../AnkifyPage/stats/types';

type VariantKey = 'active' | 'mixed' | 'empty';

const VARIANTS: { key: VariantKey; label: string }[] = [
  { key: 'active', label: 'Active' },
  { key: 'mixed', label: 'Mixed states' },
  { key: 'empty', label: 'First run' },
];

const todayKey = (): string => new Date().toISOString().slice(0, 10);

const genReviews = (busy: boolean): AnkifyStatsReviewDay[] => {
  const days: AnkifyStatsReviewDay[] = [];
  const end = new Date();
  for (let i = 364; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(end.getDate() - i);
    const date = d.toISOString().slice(0, 10);
    let count = 0;
    if (busy) {
      const base = (i * 13) % 47;
      count = d.getDay() === 0 ? Math.max(0, base - 28) : base;
      if (i % 11 === 0) count = 0;
    }
    days.push({ date, count });
  }
  return days;
};

const healthyDecks: SwissPanelDeck[] = [
  {
    id: '1',
    title: '常用漢字',
    url: 'https://notion.so/preview-1',
    deckPath: 'M3::GS::07. Small Bowel, IBD',
    status: 'running',
    syncedAgo: '2m',
    backlog: 0,
    menuOpen: true,
  },
  {
    id: '2',
    title: 'Inflammatory Bowel Disease (Crohn’s and UC)',
    url: 'https://notion.so/preview-2',
    deckPath: 'M3::GS::06. Colorectal',
    status: 'running',
    syncedAgo: '5m',
    backlog: 3,
  },
  {
    id: '3',
    title: 'Pharmacology Week 7',
    url: 'https://notion.so/preview-3',
    deckPath: 'Notion Sync::Pharmacology',
    status: 'running',
    syncedAgo: '12m',
    backlog: 0,
  },
];

const mixedDecks: SwissPanelDeck[] = [
  {
    id: '1',
    title: '常用漢字',
    deckPath: 'M3::GS::07. Small Bowel, IBD',
    status: 'syncing',
    backlog: 1,
  },
  {
    id: '2',
    title: 'Colorectal surgery',
    deckPath: 'M3::GS::08. Colorectal',
    status: 'error',
    syncedAgo: '1h',
    backlog: 12,
    message: 'Couldn’t reach AnkiWeb. Open Anki, sign in, then try again.',
  },
  {
    id: '3',
    title: 'Pharmacology Week 7',
    deckPath: 'Notion Sync::Pharmacology',
    status: 'offline',
    syncedAgo: '3h',
    backlog: 0,
    message: 'Anki client offline — will retry next tick.',
  },
];

const breakdownDecks: AnkifyStatsDeck[] = [
  { name: 'Small Bowel, IBD', new: 12, learning: 8, review: 64, total: 84 },
  { name: 'Colorectal', new: 5, learning: 14, review: 48, total: 67 },
  { name: 'Pharmacology', new: 20, learning: 3, review: 31, total: 54 },
  { name: 'Anatomy', new: 0, learning: 6, review: 22, total: 28 },
];

interface SummaryStat {
  value: string;
  label: string;
}

const summaryFor = (variant: VariantKey): SummaryStat[] => {
  if (variant === 'empty') {
    return [
      { value: '0', label: 'day streak' },
      { value: '0', label: 'daily average' },
      { value: '0', label: 'reviews this year' },
    ];
  }
  return [
    { value: '42', label: 'day streak' },
    { value: '38', label: 'daily average' },
    { value: '6 240', label: 'reviews this year' },
  ];
};

const AnkifyPreviewPage = (): ReactElement => {
  const [variant, setVariant] = useState<VariantKey>('active');

  const decksByVariant: Record<VariantKey, SwissPanelDeck[]> = {
    active: healthyDecks,
    mixed: mixedDecks,
    empty: [],
  };
  const decks = decksByVariant[variant];
  const reviews = genReviews(variant !== 'empty');
  const hasReviews = variant !== 'empty';
  const summary = summaryFor(variant);

  return (
    <div className={styles.page}>
      <div className={styles.switcher}>
        <span className={styles.switcherLabel}>Swiss Panel · variant</span>
        {VARIANTS.map((v) => (
          <button
            key={v.key}
            type="button"
            className={
              v.key === variant
                ? `${styles.switchBtn} ${styles.switchBtnActive}`
                : styles.switchBtn
            }
            onClick={() => setVariant(v.key)}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div className={styles.workspaceBar}>
        <span className={styles.wbStatus}>
          <span className={styles.wbDot} aria-hidden="true" />
          Anki running
        </span>
        <span className={styles.wbSession}>Session active</span>
        <span className={styles.wbActions}>
          <button
            type="button"
            className={`${styles.iconBtn} ${styles.iconBtnPrimary}`}
            aria-label="Open Anki"
            title="Open Anki"
          >
            <ExternalLinkIcon width={18} height={18} />
          </button>
          <span className={styles.wbSecondary}>
            <button
              type="button"
              className={styles.iconBtn}
              aria-label="Restart Anki"
              title="Restart Anki"
            >
              <RefreshIcon width={18} height={18} />
            </button>
            <button
              type="button"
              className={styles.iconBtn}
              aria-label="Shut down Anki"
              title="Shut down Anki"
            >
              <ArrowRightOnRectangleIcon width={18} height={18} />
            </button>
          </span>
          <span className={styles.wbMoreWrap}>
            <button
              type="button"
              className={styles.iconBtn}
              aria-label="More Anki session options"
              title="More"
            >
              <DotsHorizontal width={18} height={18} />
            </button>
            <div className={styles.wbMenu} role="menu">
              <button
                type="button"
                className={styles.wbMenuItem}
                role="menuitem"
              >
                Restart Anki
              </button>
              <button
                type="button"
                className={styles.wbMenuItem}
                role="menuitem"
              >
                Shut down Anki
              </button>
            </div>
          </span>
        </span>
      </div>

      <h1 className={styles.title}>Ankify</h1>

      {variant === 'mixed' && (
        <div className={styles.conflictsBanner}>
          <span>2 to resolve.</span>
          <span aria-hidden="true">·</span>
          <span>Review →</span>
        </div>
      )}

      <div className={styles.tabBar}>
        <span className={`${styles.tab} ${styles.tabActive}`}>
          Decks {decks.length}
        </span>
        <span className={styles.tab}>Find pages</span>
      </div>

      <SwissPanelDeckList decks={decks} />

      <div className={styles.historyFooter}>
        <span>Study history goes to a Notion database.</span>
        <span>Set it up →</span>
      </div>

      <section className={styles.statsSection}>
        <h2 className={styles.statsHead}>Your reviews</h2>
        <p className={styles.statsLead}>Live from Anki.</p>

        <p className={styles.summary}>
          {summary.map((stat) => (
            <span key={stat.label} className={styles.summaryStat}>
              <span className={styles.summaryValue}>{stat.value}</span>
              <span className={styles.summaryLabel}>{stat.label}</span>
            </span>
          ))}
        </p>

        <div className={styles.block}>
          <ReviewStreakHeatmap
            reviewsByDay={reviews}
            today={todayKey()}
            currentStreak={hasReviews ? 42 : 0}
            reviewsThisYear={hasReviews ? 6240 : 0}
          />
        </div>

        {hasReviews ? (
          <div className={styles.block}>
            <DeckBreakdownChart decks={breakdownDecks} />
          </div>
        ) : (
          <p className={styles.stateText}>
            No reviews yet. Study a deck in Anki and your activity shows up
            here.
          </p>
        )}
      </section>
    </div>
  );
};

export default AnkifyPreviewPage;
