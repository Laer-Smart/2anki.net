import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { track } from '../../../../lib/analytics/track';

interface OverSplitNoticeProps {
  cardCount: number | null;
}

export function OverSplitNotice({ cardCount }: Readonly<OverSplitNoticeProps>) {
  const { t } = useTranslation();
  useEffect(() => {
    track('conversion_pathology_shown', {
      signal: 'over_split',
      card_count: cardCount ?? 0,
    });
  }, [cardCount]);

  return <p>{t('upload.overSplit')}</p>;
}
