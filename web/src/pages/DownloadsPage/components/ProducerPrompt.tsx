import { useEffect, useState } from 'react';

import { ProducerCaptureModal } from '../../../components/ProducerCaptureModal/ProducerCaptureModal';
import { get2ankiApi } from '../../../lib/backend/get2ankiApi';
import UserUpload from '../../../lib/interfaces/UserUpload';
import { isHeavyUploader } from '../helpers/producerUploadGate';
import sharedStyles from '../../../styles/shared.module.css';

const PRODUCER_PLACEMENT = 'producer_prompt';

const CARD_TITLE = 'Making decks for other people?';
const CARD_BODY =
  "You've built a lot of decks. If you're making them for students, a class, or customers, we want to hear what would help. There's no product for this yet — we're deciding what to build.";
const CARD_CTA = 'Tell us what you need';
const CARD_DISMISS = 'Not now';

export function ProducerPrompt({
  uploads,
}: Readonly<{ uploads: UserUpload[] }>) {
  const heavy = isHeavyUploader(uploads);
  const [eligible, setEligible] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);

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
              <h3 className={sharedStyles.surfaceTitle}>{CARD_TITLE}</h3>
              <p className={sharedStyles.surfaceLead}>{CARD_BODY}</p>
            </div>
          </div>
          <div className={sharedStyles.surfaceActions}>
            <button
              type="button"
              className={sharedStyles.btnSecondary}
              onClick={() => setOpen(true)}
            >
              {CARD_CTA}
            </button>
            <button
              type="button"
              className={sharedStyles.btnGhost}
              onClick={dismiss}
            >
              {CARD_DISMISS}
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
