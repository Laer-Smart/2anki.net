import { useEffect } from 'react';
import { track } from '../../../../lib/analytics/track';

interface OverSplitNoticeProps {
  cardCount: number | null;
}

export function OverSplitNotice({ cardCount }: Readonly<OverSplitNoticeProps>) {
  useEffect(() => {
    track('conversion_pathology_shown', {
      signal: 'over_split',
      card_count: cardCount ?? 0,
    });
  }, [cardCount]);

  return (
    <p>
      Many card fronts are just one or two words, which usually means the file
      split mid-sentence. Look over the deck before you study, or upload the
      original Word or Notion file for cleaner cards.
    </p>
  );
}
