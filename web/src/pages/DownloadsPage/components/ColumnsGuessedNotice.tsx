import { useEffect } from 'react';
import { track } from '../../../lib/analytics/track';

interface ColumnsGuessedNoticeProps {
  frontField: string;
  backField: string;
}

export function ColumnsGuessedNotice({
  frontField,
  backField,
}: Readonly<ColumnsGuessedNoticeProps>) {
  useEffect(() => {
    track('columns_guessed_notice_shown', { surface: 'notion_database' });
  }, []);

  return (
    <p>
      We couldn&apos;t tell which columns are the question and answer, so this
      deck uses{' '}
      <span data-hj-suppress style={{ fontWeight: 500 }}>
        {frontField}
      </span>{' '}
      as the front and{' '}
      <span data-hj-suppress style={{ fontWeight: 500 }}>
        {backField}
      </span>{' '}
      as the back. Convert the database again to pick different columns.
    </p>
  );
}
