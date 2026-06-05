import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { track } from '../../../lib/analytics/track';

interface TruncationNoticeProps {
  blocksConverted: number;
  subDeckRulesSkipped: boolean;
}

export function TruncationNotice({
  blocksConverted,
  subDeckRulesSkipped,
}: Readonly<TruncationNoticeProps>) {
  useEffect(() => {
    track('paywall_shown', { surface: 'truncated_notice' });
  }, []);

  return (
    <div>
      <p>
        Converted the first {blocksConverted} blocks. The free plan stops there
        —{' '}
        <Link to="/pricing?source=truncated-conversion">
          upgrade to convert the whole page
        </Link>
        .
      </p>
      {subDeckRulesSkipped && (
        <p>
          Sub-deck rules from toggles, headings, and databases apply on paid
          plans — this deck converted without them.
        </p>
      )}
    </div>
  );
}
