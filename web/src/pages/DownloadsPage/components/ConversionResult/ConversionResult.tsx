import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { Link } from 'react-router-dom';
import { classifyUploadError } from '../../../../components/errors/helpers/getErrorMessage';
import { parseAmbiguousColumnsPayload } from '../../../../lib/fieldMapping/types';
import {
  getSubscribeLink,
  PASS_PRICES,
} from '../../../PricingPage/payment.links';
import { get2ankiApi } from '../../../../lib/backend/get2ankiApi';
import { track } from '../../../../lib/analytics/track';
import { formatResetDate } from './formatResetDate';
import type { UploadErrorBody } from '../../../../types/UploadErrorBody';
import sharedStyles from '../../../../styles/shared.module.css';
import styles from './ConversionResult.module.css';

const PAYWALL_SURFACE = 'downloads-limit';

type Source = 'notion' | 'upload' | 'dropbox' | 'drive';

const NOTION_TOKEN_EXPIRED_REASON = 'notion_token_expired';
const EMPTY_DECK_REASON_PREFIX = 'No cards in this deck yet.';
const TOGGLES_DOCS_LABEL = 'See how toggles become cards';
const TOGGLES_DOCS_HREF = '/documentation/cards/notion-blocks';
const EMPTY_DECK_TEACHING_COPY =
  "2anki makes a card from every Notion toggle — the toggle title becomes the question, what's inside becomes the answer. Wrap your key terms in toggles, then convert again.";

interface ProcessingProps {
  variant: 'processing';
  children: ReactNode;
}

interface PaywalledProps {
  variant: 'paywalled';
  title: string | null;
  limit: number;
  cardsUsed: number;
  resetOn?: string;
  email?: string;
}

interface FailedProps {
  variant: 'failed';
  title: string | null;
  failureReason: string;
  source: Source;
  onMapColumns: () => void;
}

interface SuccessProps {
  variant: 'success';
  count: number;
}

type ConversionResultProps =
  | ProcessingProps
  | PaywalledProps
  | FailedProps
  | SuccessProps;

function buildPaywallHeadline(cardsUsed: number, limit: number): string {
  if (cardsUsed >= limit) {
    return `You've reached your ${limit} free cards this month`;
  }
  return `You've used ${cardsUsed} of your ${limit} free cards this month`;
}

function buildPaywallBody(resetDate: string | null): string {
  if (resetDate == null) {
    return "This conversion would go past your free limit, so it didn't finish. Get a pass to keep converting now.";
  }
  return `This conversion would go past your free limit, so it didn't finish. Your free cards refresh on ${resetDate}, or get a pass to keep converting now.`;
}

function PaywalledVariant({
  limit,
  cardsUsed,
  resetOn,
  email,
}: Omit<PaywalledProps, 'variant' | 'title'>) {
  const shownFiredRef = useRef(false);
  const [pendingKind, setPendingKind] = useState<'24h' | '7d' | null>(null);
  const upgradeHref = getSubscribeLink(email);
  const resetDate = formatResetDate(resetOn);

  useEffect(() => {
    if (shownFiredRef.current) return;
    shownFiredRef.current = true;
    track('paywall_shown', { surface: PAYWALL_SURFACE });
  }, []);

  const handlePassClick = async (kind: '24h' | '7d') => {
    track('paywall_pass_clicked', {
      surface: PAYWALL_SURFACE,
      plan: kind === '24h' ? 'day' : 'week',
    });
    setPendingKind(kind);
    const result = await get2ankiApi().startPassCheckout(
      kind,
      undefined,
      PAYWALL_SURFACE
    );
    if ('url' in result) {
      globalThis.location.href = result.url;
      return;
    }
    setPendingKind(null);
  };

  const handleUnlimitedClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (pendingKind != null) {
      event.preventDefault();
      return;
    }
    track('paywall_upgrade_clicked', {
      surface: PAYWALL_SURFACE,
      plan: 'unlimited',
    });
  };

  return (
    <div className={styles.paywalled}>
      <p className={styles.paywallHeadline}>
        {buildPaywallHeadline(cardsUsed, limit)}
      </p>
      <p className={styles.paywallBody}>{buildPaywallBody(resetDate)}</p>
      <div className={styles.paywallActions}>
        <button
          type="button"
          className={`${sharedStyles.btnPrimary} ${sharedStyles.btnInline}`}
          onClick={() => handlePassClick('24h')}
          disabled={pendingKind != null}
        >
          {pendingKind === '24h'
            ? 'Opening checkout'
            : `Get Day Pass — ${PASS_PRICES['24h']}`}
        </button>
        <button
          type="button"
          className={`${sharedStyles.btnSecondary} ${sharedStyles.btnInline}`}
          onClick={() => handlePassClick('7d')}
          disabled={pendingKind != null}
        >
          {pendingKind === '7d'
            ? 'Opening checkout'
            : `Get Week Pass — ${PASS_PRICES['7d']}`}
        </button>
        <a
          href={upgradeHref}
          className={styles.seeAllPlans}
          onClick={handleUnlimitedClick}
          aria-disabled={pendingKind != null}
          tabIndex={pendingKind == null ? undefined : -1}
        >
          Upgrade to Unlimited
        </a>
      </div>
    </div>
  );
}

function FailedVariant({
  failureReason,
  source,
  onMapColumns,
}: Omit<FailedProps, 'variant' | 'title'>) {
  if (source === 'notion' && failureReason === NOTION_TOKEN_EXPIRED_REASON) {
    return (
      <div>
        <p>Notion connection expired. Reconnect to keep converting pages.</p>
        <a href="/notion" className={sharedStyles.btnPrimary}>
          Reconnect Notion
        </a>
      </div>
    );
  }

  if (failureReason.startsWith(EMPTY_DECK_REASON_PREFIX)) {
    return (
      <div>
        <p>{EMPTY_DECK_TEACHING_COPY}</p>
        <Link
          to={TOGGLES_DOCS_HREF}
          className={`${sharedStyles.btnPrimary} ${sharedStyles.btnInline}`}
        >
          {TOGGLES_DOCS_LABEL}
        </Link>
      </div>
    );
  }

  if (parseAmbiguousColumnsPayload(failureReason) != null) {
    return (
      <div>
        <p>
          This database has more than two columns. Pick which column should be
          the front and back of each card.
        </p>
        <button
          type="button"
          className={sharedStyles.btnPrimary}
          onClick={onMapColumns}
        >
          Map columns
        </button>
      </div>
    );
  }

  const isTooLarge =
    failureReason.includes('too large') ||
    failureReason.includes('MemoryError') ||
    failureReason.includes('Killed');
  const errorBody: UploadErrorBody = {
    code: isTooLarge ? 'too_large' : 'unknown',
    message: failureReason,
  };
  const friendly = classifyUploadError(errorBody);
  return (
    <>
      <p>
        {friendly.detail
          ? `${friendly.title} ${friendly.detail}`
          : friendly.title}
      </p>
      <p>
        Something looks off? <Link to="/status">Check status.</Link>
      </p>
    </>
  );
}

function SuccessVariant({ count }: Omit<SuccessProps, 'variant'>) {
  const noun = count === 1 ? 'card' : 'cards';
  return (
    <div className={styles.success}>
      <span className={styles.cardCount}>
        <span className={styles.cardCountNumber}>{count}</span>
        <span className={styles.cardCountLabel}>{noun}</span>
      </span>
      <span className={styles.helperText}>
        No empty backs, no stray characters. Ready for Anki.
      </span>
    </div>
  );
}

export function ConversionResult(props: Readonly<ConversionResultProps>) {
  if (props.variant === 'processing') {
    return <>{props.children}</>;
  }

  if (props.variant === 'success') {
    return <SuccessVariant count={props.count} />;
  }

  if (props.variant === 'paywalled') {
    return (
      <PaywalledVariant
        limit={props.limit}
        cardsUsed={props.cardsUsed}
        resetOn={props.resetOn}
        email={props.email}
      />
    );
  }

  return (
    <FailedVariant
      failureReason={props.failureReason}
      source={props.source}
      onMapColumns={props.onMapColumns}
    />
  );
}
