import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ProducerCaptureModal } from '../../../components/ProducerCaptureModal/ProducerCaptureModal';
import { track } from '../../../lib/analytics/track';
import { get2ankiApi } from '../../../lib/backend/get2ankiApi';
import UserUpload from '../../../lib/interfaces/UserUpload';
import { isHeavyUploader } from '../helpers/producerUploadGate';
import sharedStyles from '../../../styles/shared.module.css';

const PRODUCER_PLACEMENT = 'producer_prompt';

export function ProducerPrompt({
  uploads,
}: Readonly<{ uploads: UserUpload[] }>) {
  const { t } = useTranslation('downloadsx');
  const heavy = isHeavyUploader(uploads);
  const [eligible, setEligible] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const viewFiredRef = useRef(false);

  useEffect(() => {
    if (heavy && eligible === true && !viewFiredRef.current) {
      viewFiredRef.current = true;
      track('producer_entry_viewed', { source: 'heavy_uploader_prompt' });
    }
  }, [heavy, eligible]);

  useEffect(() => {
    if (!heavy) return;
    let cancelled = false;
    get2ankiApi()
      .getPitchEligibility()
      .then((result) => {
        if (!cancelled) setEligible(result.producerPrompt);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [heavy]);

  if (!heavy || eligible !== true) return null;

  const persist = async () => {
    await get2ankiApi().dismissPitch(PRODUCER_PLACEMENT);
    setHidden(true);
  };

  const dismiss = () => {
    setHidden(true);
    get2ankiApi()
      .dismissPitch(PRODUCER_PLACEMENT)
      .catch(() => {});
  };

  return (
    <>
      {!hidden && (
        <div className={sharedStyles.surface}>
          <div className={sharedStyles.surfaceHeader}>
            <div className={sharedStyles.surfaceHeaderText}>
              <h3 className={sharedStyles.surfaceTitle}>
                {t('producer.title')}
              </h3>
              <p className={sharedStyles.surfaceLead}>{t('producer.body')}</p>
            </div>
          </div>
          <div className={sharedStyles.surfaceActions}>
            <button
              type="button"
              className={sharedStyles.btnSecondary}
              onClick={() => setOpen(true)}
            >
              {t('producer.cta')}
            </button>
            <button
              type="button"
              className={sharedStyles.btnGhost}
              onClick={dismiss}
            >
              {t('producer.dismiss')}
            </button>
          </div>
        </div>
      )}
      <ProducerCaptureModal
        isOpen={open}
        source="heavy_uploader_prompt"
        onClose={() => setOpen(false)}
        onSubmit={persist}
      />
    </>
  );
}
