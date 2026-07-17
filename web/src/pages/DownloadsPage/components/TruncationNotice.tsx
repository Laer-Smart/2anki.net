import { useEffect } from 'react';
import { Trans, useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('downloadsx');

  useEffect(() => {
    track('paywall_shown', { surface: 'truncated_notice' });
  }, []);

  return (
    <div>
      <p>
        <Trans
          t={t}
          i18nKey="truncation.converted"
          count={blocksConverted}
          values={{ count: blocksConverted }}
          components={{
            pricingLink: <Link to="/pricing?source=truncated-conversion" />,
          }}
        />
      </p>
      {subDeckRulesSkipped && <p>{t('truncation.subDeckSkipped')}</p>}
    </div>
  );
}
