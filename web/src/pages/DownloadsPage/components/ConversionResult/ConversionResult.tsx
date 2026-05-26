import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { classifyUploadError } from '../../../../components/errors/helpers/getErrorMessage';
import { parseAmbiguousColumnsPayload } from '../../../../lib/fieldMapping/types';
import { getSubscribeLink } from '../../../PricingPage/payment.links';
import { fireAnalyticsEvent } from '../../../../lib/analytics/fireAnalyticsEvent';
import { track } from '../../../../lib/analytics/track';
import type { UploadErrorBody } from '../../../../types/UploadErrorBody';
import sharedStyles from '../../../../styles/shared.module.css';
import styles from './ConversionResult.module.css';

type Source = 'notion' | 'upload' | 'dropbox' | 'drive';

const NOTION_TOKEN_EXPIRED_REASON = 'notion_token_expired';

interface SuccessProps {
  variant: 'success';
  title: string | null;
  cardCount?: number;
  downloadKey: string;
  onDownload: () => void;
}

interface ProcessingProps {
  variant: 'processing';
  children: ReactNode;
}

interface PaywalledProps {
  variant: 'paywalled';
  title: string | null;
  limit: number;
  email?: string;
}

interface FailedProps {
  variant: 'failed';
  title: string | null;
  failureReason: string;
  source: Source;
  onMapColumns: () => void;
}

type ConversionResultProps =
  | SuccessProps
  | ProcessingProps
  | PaywalledProps
  | FailedProps;

function truncateTitle(title: string): { display: string; full: string } {
  if (title.length <= 40) return { display: title, full: title };
  return { display: `${title.slice(0, 40)}…`, full: title };
}

function SuccessVariant({ title, cardCount, downloadKey, onDownload }: Omit<SuccessProps, 'variant'>) {
  const resolvedTitle = title ?? 'Untitled deck';
  const { display, full } = truncateTitle(resolvedTitle);

  return (
    <div className={styles.success}>
      <span className={styles.deckName} title={full}>
        {display}
      </span>
      {cardCount != null && cardCount > 0 && (
        <span className={styles.cardCount}>
          <span className={styles.cardCountNumber}>{cardCount}</span>
          {' '}
          <span className={styles.cardCountLabel}>cards</span>
        </span>
      )}
      <span className={styles.helperText}>Ready to download.</span>
      <a
        href={`/api/download/u/${downloadKey}`}
        className={`${sharedStyles.btnPrimary} ${sharedStyles.btnInline}`}
        aria-label={`Download ${full}`}
        onClick={() => {
          onDownload();
          fireAnalyticsEvent('deck_downloaded');
          track('deck_downloaded');
        }}
      >
        Download deck
      </a>
    </div>
  );
}

function PaywalledVariant({ limit, email }: Omit<PaywalledProps, 'variant' | 'title'>) {
  const upgradeHref = `${getSubscribeLink(email)}&ref=downloads-paywall`;

  return (
    <div className={styles.paywalled}>
      <p className={styles.paywallHeadline}>Your monthly limit: {limit} cards</p>
      <p className={styles.paywallBody}>
        This conversion didn&apos;t finish. Upgrade to keep converting — no cap, no wait.
      </p>
      <div className={styles.paywallActions}>
        <a href={upgradeHref} className={`${sharedStyles.btnPrimary} ${sharedStyles.btnInline}`}>
          Upgrade to Unlimited
        </a>
        <Link to="/pricing" className={styles.seeAllPlans}>
          See all plans
        </Link>
      </div>
    </div>
  );
}

function FailedVariant({ failureReason, source, onMapColumns }: Omit<FailedProps, 'variant' | 'title'>) {
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

  if (parseAmbiguousColumnsPayload(failureReason) != null) {
    return (
      <div>
        <p>
          This database has more than two columns. Pick which column should be the front and back of each card.
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
    <p>
      {friendly.detail ? `${friendly.title} ${friendly.detail}` : friendly.title}
    </p>
  );
}

export function ConversionResult(props: Readonly<ConversionResultProps>) {
  if (props.variant === 'processing') {
    return <>{props.children}</>;
  }

  if (props.variant === 'success') {
    return (
      <SuccessVariant
        title={props.title}
        cardCount={props.cardCount}
        downloadKey={props.downloadKey}
        onDownload={props.onDownload}
      />
    );
  }

  if (props.variant === 'paywalled') {
    return (
      <PaywalledVariant
        limit={props.limit}
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
