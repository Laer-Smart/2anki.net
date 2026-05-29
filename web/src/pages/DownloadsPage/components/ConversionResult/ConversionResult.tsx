import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { classifyUploadError } from '../../../../components/errors/helpers/getErrorMessage';
import { parseAmbiguousColumnsPayload } from '../../../../lib/fieldMapping/types';
import { getSubscribeLink } from '../../../PricingPage/payment.links';
import type { UploadErrorBody } from '../../../../types/UploadErrorBody';
import sharedStyles from '../../../../styles/shared.module.css';
import styles from './ConversionResult.module.css';

type Source = 'notion' | 'upload' | 'dropbox' | 'drive';

const NOTION_TOKEN_EXPIRED_REASON = 'notion_token_expired';

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
  | ProcessingProps
  | PaywalledProps
  | FailedProps;

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
    <>
      <p>
        {friendly.detail ? `${friendly.title} ${friendly.detail}` : friendly.title}
      </p>
      <p>
        Something looks off? <Link to="/status">Check status.</Link>
      </p>
    </>
  );
}

export function ConversionResult(props: Readonly<ConversionResultProps>) {
  if (props.variant === 'processing') {
    return <>{props.children}</>;
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
