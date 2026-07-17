import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { track } from '../../../lib/analytics/track';

type ImageDropSource = 'notion' | 'upload';

interface ImageDropNoticeProps {
  count: number;
  source?: ImageDropSource;
  multipleDecks?: boolean;
}

export function ImageDropNotice({
  count,
  source = 'notion',
  multipleDecks = false,
}: Readonly<ImageDropNoticeProps>) {
  const { t } = useTranslation('downloadsx');

  useEffect(() => {
    track('image_drop_notice_shown', { dropped_count: count, source });
  }, [count, source]);

  const uploadKey = multipleDecks
    ? 'imageDrop.uploadMultiDeck'
    : 'imageDrop.uploadSingleDeck';
  const key = source === 'upload' ? uploadKey : 'imageDrop.notion';

  return <p>{t(key, { count })}</p>;
}
