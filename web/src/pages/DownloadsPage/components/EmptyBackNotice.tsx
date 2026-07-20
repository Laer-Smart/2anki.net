import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { track } from '../../../lib/analytics/track';

interface EmptyBackNoticeProps {
  count: number;
  multipleDecks?: boolean;
}

export function EmptyBackNotice({
  count,
  multipleDecks = false,
}: Readonly<EmptyBackNoticeProps>) {
  const { t } = useTranslation('downloadsx');

  useEffect(() => {
    track('empty_back_notice_shown', { empty_back_count: count });
  }, [count]);

  const key = multipleDecks
    ? 'emptyBack.uploadMultiDeck'
    : 'emptyBack.uploadSingleDeck';

  return <p>{t(key, { count })}</p>;
}
