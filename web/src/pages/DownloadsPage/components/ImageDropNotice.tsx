import { useEffect } from 'react';
import { track } from '../../../lib/analytics/track';

type ImageDropSource = 'notion' | 'upload';

interface ImageDropNoticeProps {
  count: number;
  source?: ImageDropSource;
}

function notionCopy(count: number) {
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

function uploadCopy(count: number) {
  if (count === 1) {
    return (
      <p>
        1 image couldn&apos;t be downloaded and isn&apos;t in this deck. The
        link to it in your file most likely expired. Convert again to try
        fetching it.
      </p>
    );
  }
  return (
    <p>
      {count} images couldn&apos;t be downloaded and aren&apos;t in this deck.
      The links to them in your file most likely expired. Convert again to try
      fetching them.
    </p>
  );
}

export function ImageDropNotice({
  count,
  source = 'notion',
}: Readonly<ImageDropNoticeProps>) {
  useEffect(() => {
    track('image_drop_notice_shown', { dropped_count: count, source });
  }, [count, source]);

  return source === 'upload' ? uploadCopy(count) : notionCopy(count);
}
