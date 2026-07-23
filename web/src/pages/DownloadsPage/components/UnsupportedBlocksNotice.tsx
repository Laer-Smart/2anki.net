import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { track } from '../../../lib/analytics/track';

interface UnsupportedBlocksNoticeProps {
  counts: Record<string, number>;
}

export function UnsupportedBlocksNotice({
  counts,
}: Readonly<UnsupportedBlocksNoticeProps>) {
  const { t } = useTranslation('downloadsx');

  const count = Object.values(counts).reduce((a, b) => a + b, 0);
  const types = Object.keys(counts).join(', ');

  useEffect(() => {
    track('unsupported_blocks_notice_shown', { count, types });
  }, [count, types]);

  return <p>{t('unsupportedBlocks.text', { count, types })}</p>;
}
