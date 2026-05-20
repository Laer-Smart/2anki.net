import { useEffect, useRef, useState } from 'react';
import { createDeckShare, revokeDeckShare, getActiveSharesForUploadKey, ActiveShare } from '../../lib/backend/getSharedDeck';
import styles from './SharePopover.module.css';

interface SharePopoverProps {
  uploadKey: string;
}

interface PopoverBodyProps {
  loading: boolean;
  share: ActiveShare | null;
  showConfirm: boolean;
  onCopy: () => void;
  onStopRequest: () => void;
  onStopConfirm: () => void;
  onKeepSharing: () => void;
}

function PopoverBody({ loading, share, showConfirm, onCopy, onStopRequest, onStopConfirm, onKeepSharing }: Readonly<PopoverBodyProps>) {
  if (loading) {
    return <p className={styles.loadingText}>Creating link…</p>;
  }
  if (share == null) {
    return <p className={styles.loadingText}>Unable to create link.</p>;
  }
  return (
    <>
      <div className={styles.urlRow}>
        <input
          type="text"
          readOnly
          value={share.url}
          className={styles.urlInput}
          aria-label="Share link"
          onFocus={(e) => e.target.select()}
        />
        <button type="button" className={styles.copyButton} onClick={onCopy}>
          Copy link
        </button>
      </div>
      <p className={styles.helperText}>
        Anyone with the link can preview the cards and download the deck. They can&apos;t edit it.
      </p>
      {showConfirm ? (
        <div className={styles.confirmDialog}>
          <p className={styles.confirmText}>
            Stop sharing this deck? The link will stop working.
          </p>
          <div className={styles.confirmButtons}>
            <button type="button" className={styles.stopButton} onClick={onStopConfirm}>
              Stop sharing
            </button>
            <button type="button" className={styles.keepButton} onClick={onKeepSharing}>
              Keep sharing
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className={styles.stopLink}
          onClick={onStopRequest}
        >
          Stop sharing
        </button>
      )}
    </>
  );
}

export function SharePopover({ uploadKey }: Readonly<SharePopoverProps>) {
  const [open, setOpen] = useState(false);
  const [share, setShare] = useState<ActiveShare | null>(null);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showToast, setShowToast] = useState(false);
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
            setShare({ token: result.token, upload_key: uploadKey, url: result.url, created_at: new Date().toISOString(), view_count: 0 });
          });
        } else {
          setShare(existing);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [open, uploadKey]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (anchorRef.current && !anchorRef.current.contains(e.target as Node)) {
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
    } catch {
      const input = document.createElement('input');
      input.value = share.url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
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
          Share
        </button>

        {open && (
          <div className={styles.popover} role="dialog" aria-label="Share this deck">
            <p className={styles.popoverTitle}>Share this deck</p>
            <PopoverBody
              loading={loading}
              share={share}
              showConfirm={showConfirm}
              onCopy={copyLink}
              onStopRequest={() => setShowConfirm(true)}
              onStopConfirm={stopSharing}
              onKeepSharing={() => setShowConfirm(false)}
            />
          </div>
        )}
      </div>

      {showToast && (
        <div className={styles.toast} role="status" aria-live="polite">
          Link copied
        </div>
      )}
    </>
  );
}
