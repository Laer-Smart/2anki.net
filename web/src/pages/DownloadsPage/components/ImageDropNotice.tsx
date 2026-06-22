import { useEffect } from 'react';
import { track } from '../../../lib/analytics/track';

interface ImageDropNoticeProps {
  count: number;
}

export function ImageDropNotice({ count }: Readonly<ImageDropNoticeProps>) {
  useEffect(() => {
    track('image_drop_notice_shown', { dropped_count: count });
  }, [count]);

  if (count === 1) {
    return (
      <p>
        1 image couldn&apos;t be downloaded and isn&apos;t in this deck. The
        link to it in Notion most likely expired. Convert the page again to try
        fetching it.
      </p>
    );
  }

  return (
    <p>
      {count} images couldn&apos;t be downloaded and aren&apos;t in this deck.
      The links to them in Notion most likely expired. Convert the page again to
      try fetching them.
    </p>
  );
}
