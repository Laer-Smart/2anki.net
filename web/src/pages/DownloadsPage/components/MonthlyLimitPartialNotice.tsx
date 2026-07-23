import { useEffect } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { track } from '../../../lib/analytics/track';

interface MonthlyLimitPartialNoticeProps {
  cardsDelivered: number;
  cardsHeldBack: number;
  limit: number;
}

export function MonthlyLimitPartialNotice({
  cardsDelivered,
  cardsHeldBack,
  limit,
}: Readonly<MonthlyLimitPartialNoticeProps>) {
  const { t } = useTranslation('downloadsx');

  useEffect(() => {
    track('paywall_shown', { surface: 'card_limit_partial_notice' });
  }, []);

  return (
    <div>
      <p>
        <Trans
          t={t}
          i18nKey="cardLimitPartial.heldBack"
          count={cardsHeldBack}
          values={{ count: cardsHeldBack, delivered: cardsDelivered, limit }}
          components={{
            pricingLink: <Link to="/pricing?source=card-limit-partial" />,
          }}
        />
      </p>
    </div>
  );
}
