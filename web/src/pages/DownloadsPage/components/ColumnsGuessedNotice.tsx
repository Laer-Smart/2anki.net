import { useEffect } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { track } from '../../../lib/analytics/track';

interface ColumnsGuessedNoticeProps {
  frontField: string;
  backField: string;
}

export function ColumnsGuessedNotice({
  frontField,
  backField,
}: Readonly<ColumnsGuessedNoticeProps>) {
  const { t } = useTranslation('downloadsx');

  useEffect(() => {
    track('columns_guessed_notice_shown', { surface: 'notion_database' });
  }, []);

  return (
    <p>
      <Trans
        t={t}
        i18nKey="columnsGuessed.text"
        values={{ frontField, backField }}
        components={{
          front: <span data-hj-suppress style={{ fontWeight: 500 }} />,
          back: <span data-hj-suppress style={{ fontWeight: 500 }} />,
        }}
      />
    </p>
  );
}
