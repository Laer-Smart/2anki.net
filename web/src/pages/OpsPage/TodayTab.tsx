import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { ContactMessage } from '../../lib/backend/Backend';
import { get2ankiApi } from '../../lib/backend/get2ankiApi';
import sharedStyles from '../../styles/shared.module.css';
import MetricCard, { formatNumberOrDash } from './MetricCard';
import {
  formatInteger,
  formatPercentOneDecimal,
  formatUsd,
} from './businessHelpers';
import { CancellationCommentPoint } from './businessTypes';
import styles from './OpsPage.module.css';
import { TodaySignal, computeTodaySignals } from './todaySignals';
import { useBusinessMetrics } from './useBusinessMetrics';
import { useConversionMetrics } from './useConversionMetrics';
import { useErrorGroups } from './useErrorGroups';
import { usePerformanceMetrics } from './usePerformanceMetrics';
import { useReturnRateMetrics } from './useReturnRateMetrics';

const MESSAGE_PREVIEW_MAX = 3;

const lowestSuccessRate = (
  free: number | null,
  paid: number | null
): number | null => {
  const present = [free, paid].filter((n): n is number => n != null);
  if (present.length === 0) {
    return null;
  }
  return Math.min(...present);
};

const formatMs = (ms: number | null): string => {
  if (ms == null) {
    return '—';
  }
  if (ms < 1000) {
    return `${Math.round(ms)} ms`;
  }
  return `${(ms / 1000).toFixed(1)} s`;
};

function SignalCopyButton({ signal }: Readonly<{ signal: TodaySignal }>) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = useCallback(() => {
    navigator.clipboard
      .writeText(signal.copyText)
      .then(() => {
        setCopied(true);
        if (timerRef.current != null) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});
  }, [signal]);

  useEffect(() => {
    return () => {
      if (timerRef.current != null) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <button
      type="button"
      className={sharedStyles.btnSmall}
      onClick={handleCopy}
    >
      {copied ? 'Copied' : 'Copy for Claude Code'}
    </button>
  );
}

function AttentionRow({ signal }: Readonly<{ signal: TodaySignal }>) {
  return (
    <li className={styles.attentionRow} data-severity={signal.severity}>
      <span className={styles.attentionBar} aria-hidden="true" />
      <span className={styles.attentionLabel}>{signal.label}</span>
      <span className={styles.attentionValue}>{signal.value}</span>
      <span className={styles.attentionDelta}>{signal.delta}</span>
      <SignalCopyButton signal={signal} />
    </li>
  );
}

function AttentionBlock({ signals }: Readonly<{ signals: TodaySignal[] }>) {
  return (
    <section className={styles.todaySection}>
      <h2 className={styles.sectionTitle}>Needs attention</h2>
      {signals.length === 0 ? (
        <p className={sharedStyles.emptyState}>Nothing needs you today.</p>
      ) : (
        <ul className={styles.attentionList}>
          {signals.map((signal) => (
            <AttentionRow key={signal.id} signal={signal} />
          ))}
        </ul>
      )}
    </section>
  );
}

function useContactMessages() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  useEffect(() => {
    let cancelled = false;
    get2ankiApi()
      .listContactMessages()
      .then((list) => {
        if (!cancelled) setMessages(list);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return messages;
}

function VoiceOfUserBlock({
  messages,
  cancellations,
}: Readonly<{
  messages: ContactMessage[];
  cancellations: CancellationCommentPoint[];
}>) {
  const unread = messages.filter((m) => !m.is_acknowledged);
  const recentMessages = unread.slice(0, MESSAGE_PREVIEW_MAX);
  const recentCancellations = cancellations.slice(0, MESSAGE_PREVIEW_MAX);

  return (
    <section className={styles.todaySection}>
      <h2 className={styles.sectionTitle}>Voice of user</h2>
      <ul className={styles.voiceList}>
        <li className={styles.voiceRow}>
          <Link to="/ops/messages" className={styles.voiceLink}>
            Unread messages
          </Link>
          <span className={styles.attentionValue}>{unread.length}</span>
        </li>
        {recentMessages.map((m) => (
          <li key={m.id} className={styles.voiceRow}>
            <Link to="/ops/messages" className={styles.voicePreview}>
              {m.message}
            </Link>
          </li>
        ))}
        {recentCancellations.map((c) => (
          <li key={`${c.created_at}-${c.reason}`} className={styles.voiceRow}>
            <Link to="/ops/business" className={styles.voicePreview}>
              Cancelled — {c.reason}: {c.comment}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

interface HealthyStat {
  title: string;
  value: string;
}

function HealthyStrip({ stats }: Readonly<{ stats: HealthyStat[] }>) {
  const [expanded, setExpanded] = useState(false);
  return (
    <section className={styles.todaySection}>
      <div className={styles.healthyHeader}>
        <h2 className={styles.sectionTitle}>Healthy</h2>
        <button
          type="button"
          className={sharedStyles.btnSmall}
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? 'Hide' : 'Show'}
        </button>
      </div>
      {expanded ? (
        <div className={styles.cardGrid}>
          {stats.map((stat) => (
            <MetricCard
              key={stat.title}
              title={stat.title}
              value={stat.value}
            />
          ))}
        </div>
      ) : (
        <p className={styles.healthyLine}>
          {stats.map((stat) => (
            <span key={stat.title} className={styles.healthyItem}>
              <span className={styles.healthyItemLabel}>{stat.title}</span>
              <span className={styles.healthyItemValue}>{stat.value}</span>
            </span>
          ))}
        </p>
      )}
    </section>
  );
}

export default function TodayTab() {
  const errors = useErrorGroups({
    source: 'all',
    sort: 'occurrences',
    status: 'unresolved',
    limit: 50,
  });
  const business = useBusinessMetrics();
  const conversion = useConversionMetrics();
  const performance = usePerformanceMetrics();
  const returnRate = useReturnRateMetrics();
  const messages = useContactMessages();

  const businessData = business.data ?? null;
  const conversionData = conversion.data ?? null;

  const signals = computeTodaySignals({
    unresolvedErrorGroups: errors.data?.groups,
    failedPaymentsWeekly: businessData?.failed_payments_weekly,
    uploadDownloadWeekly: undefined,
    conversionSuccessRatePct: lowestSuccessRate(
      conversionData?.free_conversion_success_rate_7d ?? null,
      conversionData?.paid_conversion_success_rate_7d ?? null
    ),
  });

  const p95 =
    performance.data?.durations.find((d) => d.window === '24h')?.p95_ms ?? null;

  const healthyStats: HealthyStat[] = [
    {
      title: 'MRR',
      value: formatNumberOrDash(businessData?.mrr_usd ?? null, formatUsd),
    },
    {
      title: 'Paying subs',
      value: formatNumberOrDash(
        businessData?.active_paying_subs ?? null,
        formatInteger
      ),
    },
    {
      title: 'New paid / wk',
      value: formatNumberOrDash(
        businessData?.new_paid_conversions_7d ?? null,
        formatInteger
      ),
    },
    { title: 'Job p95', value: formatMs(p95) },
    {
      title: 'Return rate 7d',
      value: formatNumberOrDash(
        returnRate.data?.overall['7d'] ?? null,
        formatPercentOneDecimal
      ),
    },
  ];

  return (
    <div className={styles.todayLayout}>
      <AttentionBlock signals={signals} />
      <VoiceOfUserBlock
        messages={messages}
        cancellations={businessData?.cancellation_comments_recent ?? []}
      />
      <HealthyStrip stats={healthyStats} />
    </div>
  );
}
