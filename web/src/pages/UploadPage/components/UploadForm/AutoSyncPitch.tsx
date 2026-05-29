import { useState } from 'react';
import { get2ankiApi } from '../../../../lib/backend/get2ankiApi';
import formStyles from './UploadForm.module.css';

interface AutoSyncPitchProps {
  onDismissed: () => void;
}

export function AutoSyncPitch({ onDismissed }: Readonly<AutoSyncPitchProps>) {
  const [dismissing, setDismissing] = useState(false);

  const handleDismiss = async () => {
    setDismissing(true);
    try {
      await get2ankiApi().dismissAutoSyncPitch('convert_success');
    } finally {
      onDismissed();
    }
  };

  if (dismissing) return null;

  return (
    <p className={formStyles.autoSyncPitch}>
      Edited this page in Notion?{' '}
      <a href="/pricing#auto-sync">
        Auto Sync keeps your deck up to date — see how it works
      </a>
      .{' '}
      <button
        type="button"
        className={formStyles.autoSyncPitchDismiss}
        onClick={handleDismiss}
        aria-label="Dismiss Auto Sync suggestion"
      >
        Not now
      </button>
    </p>
  );
}
