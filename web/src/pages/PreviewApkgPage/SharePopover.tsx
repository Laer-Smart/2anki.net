import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  createDeckShare,
  revokeDeckShare,
  getActiveSharesForUploadKey,
  setShareVisibility,
  ActiveShare,
} from '../../lib/backend/getSharedDeck';
import { track } from '../../lib/analytics/track';
import styles from './SharePopover.module.css';

interface SharePopoverProps {
  uploadKey: string;
}

interface PopoverBodyProps {
  loading: boolean;
  share: ActiveShare | null;
  showConfirm: boolean;
  publishTitle: string;
  publishing: boolean;
  publishError: string | null;
  onCopy: () => void;
  onStopRequest: () => void;
  onStopConfirm: () => void;
  onKeepSharing: () => void;
  onPublishTitleChange: (value: string) => void;
  onPublish: () => void;
  onUnpublish: () => void;
}

function PublishSection({
  share,
  publishTitle,
  publishing,
  publishError,
  onPublishTitleChange,
  onPublish,
  onUnpublish,
}: Readonly<{
  share: ActiveShare;
  publishTitle: string;
  publishing: boolean;
  publishError: string | null;
  onPublishTitleChange: (value: string) => void;
  onPublish: () => void;
  onUnpublish: () => void;
}>) {
  const { t } = useTranslation('previews');
  const [wantsPublic, setWantsPublic] = useState(share.is_public);

  if (share.is_public) {
    return (
      <div className={styles.publishSection}>
        <p className={styles.publishedText}>
          {t('share.listedAs', { title: share.title })}
        </p>
        <button
          type="button"
          className={styles.stopLink}
          onClick={onUnpublish}
          disabled={publishing}
        >
          {t('share.removeFromLibrary')}
        </button>
      </div>
    );
  }

  return (
    <div className={styles.publishSection}>
      <label className={styles.publishToggle}>
        <input
          type="checkbox"
          checked={wantsPublic}
          onChange={(e) => setWantsPublic(e.target.checked)}
        />
        {t('share.listInLibrary')}
      </label>
      {wantsPublic && (
        <>
          <p className={styles.helperText}>{t('share.listInLibraryHelper')}</p>
          <input
            type="text"
            value={publishTitle}
            onChange={(e) => onPublishTitleChange(e.target.value)}
            placeholder={t('share.deckTitlePlaceholder')}
            aria-label={t('share.deckTitle')}
            maxLength={120}
            className={styles.titleInput}
          />
          {publishError != null && (
            <p className={styles.publishError}>{publishError}</p>
          )}
          <button
            type="button"
            className={styles.copyButton}
            onClick={onPublish}
            disabled={publishing || publishTitle.trim().length === 0}
          >
            {t('share.listDeck')}
          </button>
        </>
      )}
    </div>
  );
}

function PopoverBody({
  loading,
  share,
  showConfirm,
  publishTitle,
  publishing,
  publishError,
  onCopy,
  onStopRequest,
  onStopConfirm,
  onKeepSharing,
  onPublishTitleChange,
  onPublish,
  onUnpublish,
}: Readonly<PopoverBodyProps>) {
  const { t } = useTranslation('previews');
  if (loading) {
    return <p className={styles.loadingText}>{t('share.creatingLink')}</p>;
  }
  if (share == null) {
    return (
      <p className={styles.loadingText}>{t('share.unableToCreateLink')}</p>
    );
  }
  return (
    <>
      <div className={styles.urlRow}>
        <input
          type="text"
          readOnly
          value={share.url}
          className={styles.urlInput}
          aria-label={t('share.shareLink')}
          onFocus={(e) => e.target.select()}
        />
        <button type="button" className={styles.copyButton} onClick={onCopy}>
          {t('share.copyLink')}
        </button>
      </div>
      <p className={styles.helperText}>{t('share.helper')}</p>
      <PublishSection
        share={share}
        publishTitle={publishTitle}
        publishing={publishing}
        publishError={publishError}
        onPublishTitleChange={onPublishTitleChange}
        onPublish={onPublish}
        onUnpublish={onUnpublish}
      />
      {showConfirm ? (
        <div className={styles.confirmDialog}>
          <p className={styles.confirmText}>{t('share.stopConfirm')}</p>
          <div className={styles.confirmButtons}>
            <button
              type="button"
              className={styles.stopButton}
              onClick={onStopConfirm}
            >
              {t('share.stopSharing')}
            </button>
            <button
              type="button"
              className={styles.keepButton}
              onClick={onKeepSharing}
            >
              {t('share.keepSharing')}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className={styles.stopLink}
          onClick={onStopRequest}
        >
          {t('share.stopSharing')}
        </button>
      )}
    </>
  );
}

export function SharePopover({ uploadKey }: Readonly<SharePopoverProps>) {
  const { t } = useTranslation('previews');
  const [open, setOpen] = useState(false);
  const [share, setShare] = useState<ActiveShare | null>(null);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [publishTitle, setPublishTitle] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const anchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || loading) return;
    let cancelled = false;
    setLoading(true);
    getActiveSharesForUploadKey(uploadKey)
      .then((existing) => {
        if (cancelled) return;
        if (existing == null) {
          return createDeckShare(uploadKey).then((result) => {
            if (cancelled) return;
            setShare({
              token: result.token,
              upload_key: uploadKey,
              url: result.url,
              created_at: new Date().toISOString(),
              view_count: 0,
              is_public: false,
              title: null,
              card_count: null,
            });
          });
        } else {
          setShare(existing);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, uploadKey]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (
        anchorRef.current &&
        e.target instanceof Node &&
        !anchorRef.current.contains(e.target)
      ) {
        setOpen(false);
        setShowConfirm(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const copyLink = async () => {
    if (share == null) return;
    try {
      await navigator.clipboard.writeText(share.url);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    } catch {
      // Clipboard API unavailable — the URL is selectable in the input.
    }
  };

  const stopSharing = async () => {
    if (share == null) return;
    try {
      await revokeDeckShare(share.token);
      setShare(null);
      setShowConfirm(false);
      setOpen(false);
    } catch {}
  };

  const publishToLibrary = async () => {
    if (share == null || publishTitle.trim().length === 0) return;
    setPublishing(true);
    setPublishError(null);
    try {
      const updated = await setShareVisibility(share.token, true, publishTitle);
      setShare({ ...share, ...updated });
      track('shared_deck_published');
    } catch (error) {
      setPublishError(
        error instanceof Error ? error.message : t('share.publishFailed')
      );
    } finally {
      setPublishing(false);
    }
  };

  const unpublishFromLibrary = async () => {
    if (share == null) return;
    setPublishing(true);
    try {
      const updated = await setShareVisibility(share.token, false);
      setShare({ ...share, ...updated });
      setPublishTitle('');
    } catch {
    } finally {
      setPublishing(false);
    }
  };

  return (
    <>
      <div className={styles.anchor} ref={anchorRef}>
        <button
          type="button"
          className={styles.trigger}
          onClick={() => {
            setOpen((prev) => !prev);
            setShowConfirm(false);
          }}
          aria-expanded={open}
          aria-haspopup="dialog"
        >
          {t('share.share')}
        </button>

        {open && (
          <dialog
            open
            className={styles.popover}
            aria-label={t('share.shareThisDeck')}
          >
            <p className={styles.popoverTitle}>{t('share.shareThisDeck')}</p>
            <PopoverBody
              loading={loading}
              share={share}
              showConfirm={showConfirm}
              publishTitle={publishTitle}
              publishing={publishing}
              publishError={publishError}
              onCopy={copyLink}
              onStopRequest={() => setShowConfirm(true)}
              onStopConfirm={stopSharing}
              onKeepSharing={() => setShowConfirm(false)}
              onPublishTitleChange={setPublishTitle}
              onPublish={publishToLibrary}
              onUnpublish={unpublishFromLibrary}
            />
          </dialog>
        )}
      </div>

      {showToast && (
        <div className={styles.toast} role="status" aria-live="polite">
          {t('share.linkCopied')}
        </div>
      )}
    </>
  );
}
