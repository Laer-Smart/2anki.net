import styles from './AccessBanner.module.css';

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const TEN_MINUTES_MS = 10 * 60 * 1000;

function formatExpiryDate(date: Date): string {
  return date.toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function roundToNearest10Min(ms: number): number {
  return Math.round(ms / TEN_MINUTES_MS) * TEN_MINUTES_MS;
}

function formatTimeRemaining(ms: number): string {
  const rounded = roundToNearest10Min(ms);
  const minutes = Math.floor(rounded / 60000);
  if (minutes < 60) {
    return `${minutes} minutes`;
  }
  const hours = Math.round(minutes / 60);
  return `about ${hours} hour${hours === 1 ? '' : 's'}`;
}

type PassKind = '24h' | '7d' | 'unlimited';

const PASS_LABELS: Record<PassKind, string> = {
  '24h': 'Day Pass',
  '7d': 'Week Pass',
  unlimited: 'Unlimited',
};

interface AccessBannerProps {
  passExpiresAt: string | null | undefined;
  passKind: PassKind | null | undefined;
  now?: Date;
}

export function AccessBanner({
  passExpiresAt,
  passKind,
  now = new Date(),
}: Readonly<AccessBannerProps>) {
  if (passExpiresAt == null || passKind == null) return null;

  const expiresAt = new Date(passExpiresAt);
  const remainingMs = expiresAt.getTime() - now.getTime();

  if (remainingMs <= 0) return null;

  const passLabel = PASS_LABELS[passKind];

  if (remainingMs >= TWO_HOURS_MS) {
    return (
      <output className={styles.banner}>
        <span className={styles.message}>
          {passLabel} active — expires {formatExpiryDate(expiresAt)}. Convert as
          much as you want.
        </span>
      </output>
    );
  }

  return (
    <output className={styles.banner}>
      <span className={styles.warning}>
        {passLabel} ends in {formatTimeRemaining(remainingMs)} — finish any
        pending conversions.
      </span>
    </output>
  );
}
