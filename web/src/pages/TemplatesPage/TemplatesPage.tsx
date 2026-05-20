import { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

import {
  NoteTypeStarter,
  deleteUserTemplate,
  downloadNoteTypeApkg,
  getDefaultNoteTypes,
  getOfficialNoteTypes,
  getUserTemplates,
} from '../../lib/backend/templates';
import { useDialog } from '../../lib/hooks/useDialog';
import sharedStyles from '../../styles/shared.module.css';
import DownloadIcon from '../../components/icons/DownloadIcon';
import PencilIcon from '../../components/icons/PencilIcon';
import TrashIcon from '../../components/icons/TrashIcon';
import styles from './TemplatesPage.module.css';
import { buildPreviewDocument } from './renderNoteTypePreview';

function safeFilename(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0) return 'note-type';
  return trimmed.replace(/[^A-Za-z0-9\-_ ]/g, '_');
}

async function triggerDownload(starter: NoteTypeStarter): Promise<void> {
  const blob = await downloadNoteTypeApkg(starter.noteType, starter.previewData);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${safeFilename(starter.name)}.apkg`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

interface NoteTypeCardProps {
  starter: NoteTypeStarter;
  busy: boolean;
  ownedByUser: boolean;
  onDownload: (starter: NoteTypeStarter) => void;
  onPreview: (starter: NoteTypeStarter) => void;
  onDelete?: (starter: NoteTypeStarter) => void;
}

function NoteTypeCard({
  starter,
  busy,
  ownedByUser,
  onDownload,
  onPreview,
  onDelete,
}: Readonly<NoteTypeCardProps>) {
  const previewDoc = useMemo(
    () => buildPreviewDocument(starter.noteType, starter.previewData, 'front'),
    [starter]
  );
  const editHref = `/templates/edit/${encodeURIComponent(starter.id)}`;

  return (
    <article className={styles.card}>
      <div className={styles.previewWrap}>
        <iframe
          title={`${starter.name} preview`}
          className={styles.previewFrame}
          sandbox=""
          srcDoc={previewDoc}
        />
      </div>
      <div className={styles.body}>
        <h2 className={styles.name}>
          <button
            type="button"
            className={styles.nameButton}
            onClick={() => onPreview(starter)}
          >
            {starter.name}
          </button>
        </h2>
        <p className={styles.description}>{starter.description}</p>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.iconButton}
            onClick={() => onDownload(starter)}
            disabled={busy}
            aria-label={busy ? 'Preparing .apkg' : `Download ${starter.name} as .apkg`}
            title={busy ? 'Preparing…' : 'Download .apkg'}
          >
            <DownloadIcon width={18} height={18} />
          </button>
          <Link
            to={editHref}
            className={styles.iconLink}
            aria-label={
              ownedByUser
                ? `Edit ${starter.name}`
                : `Customize ${starter.name}`
            }
            title={ownedByUser ? 'Edit' : 'Customize'}
          >
            <PencilIcon width={18} height={18} />
          </Link>
          {ownedByUser && onDelete && (
            <button
              type="button"
              className={`${styles.iconButton} ${styles.deleteButton}`}
              onClick={() => onDelete(starter)}
              aria-label={`Delete ${starter.name}`}
              title="Delete"
            >
              <TrashIcon width={18} height={18} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

interface PreviewModalProps {
  starter: NoteTypeStarter;
  onClose: () => void;
}

function PreviewModal({ starter, onClose }: Readonly<PreviewModalProps>) {
  const frontDoc = useMemo(
    () => buildPreviewDocument(starter.noteType, starter.previewData, 'front'),
    [starter]
  );
  const backDoc = useMemo(
    () => buildPreviewDocument(starter.noteType, starter.previewData, 'back'),
    [starter]
  );
  const dialogRef = useDialog(true, onClose);

  return (
    <dialog
      ref={dialogRef}
      className={sharedStyles.dialog}
      aria-labelledby="note-type-preview-title"
    >
      <div className={`${sharedStyles.modalCard} ${styles.dialog}`}>
        <div className={sharedStyles.modalHeader}>
          <h2
            id="note-type-preview-title"
            className={sharedStyles.modalHeaderTitle}
          >
            {starter.name}
          </h2>
          <button
            type="button"
            className={sharedStyles.modalClose}
            onClick={onClose}
            aria-label="Close"
          >
            &times;
          </button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.modalSide}>
            <span className={styles.sideLabel}>Front</span>
            <div className={styles.modalFrameWrap}>
              <iframe
                title={`${starter.name} front preview`}
                className={styles.modalFrame}
                sandbox=""
                srcDoc={frontDoc}
              />
            </div>
          </div>
          <div className={styles.modalSide}>
            <span className={styles.sideLabel}>Back</span>
            <div className={styles.modalFrameWrap}>
              <iframe
                title={`${starter.name} back preview`}
                className={styles.modalFrame}
                sandbox=""
                srcDoc={backDoc}
              />
            </div>
          </div>
        </div>
      </div>
    </dialog>
  );
}

export function TemplatesPage() {
  const [starters, setStarters] = useState<NoteTypeStarter[] | null>(null);
  const [userIds, setUserIds] = useState<Set<string>>(new Set());
  const [officialIds, setOfficialIds] = useState<Set<string>>(new Set());
  const [loadError, setLoadError] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [previewed, setPreviewed] = useState<NoteTypeStarter | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    Promise.all([
      getDefaultNoteTypes(),
      getOfficialNoteTypes().catch(() => []),
      getUserTemplates().catch(() => ({ templates: [], hiddenIds: [] })),
    ])
      .then(([defaults, official, user]) => {
        if (cancelled) return;
        const hidden = new Set(user.hiddenIds);
        const officialIdSet = new Set(official.map((s) => s.id));
        const visibleDefaults = defaults.filter((s) => !hidden.has(s.id));
        const visibleOfficial = official.filter((s) => !hidden.has(s.id));
        const seen = new Set<string>();
        const merged: NoteTypeStarter[] = [];
        for (const item of [
          ...user.templates,
          ...visibleOfficial,
          ...visibleDefaults,
        ]) {
          if (!item?.id || seen.has(item.id)) continue;
          seen.add(item.id);
          merged.push(item);
        }
        setStarters(merged);
        setOfficialIds(officialIdSet);
        setUserIds(new Set(user.templates.map((t) => t.id)));
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLoadError(
          error instanceof Error ? error.message : 'Could not load note types'
        );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const ownedStarters = useMemo(
    () => (starters ?? []).filter((s) => userIds.has(s.id)),
    [starters, userIds]
  );
  const officialStarters = useMemo(
    () =>
      (starters ?? []).filter(
        (s) => !userIds.has(s.id) && officialIds.has(s.id)
      ),
    [starters, userIds, officialIds]
  );
  const defaultStarters = useMemo(
    () =>
      (starters ?? []).filter(
        (s) => !userIds.has(s.id) && !officialIds.has(s.id)
      ),
    [starters, userIds, officialIds]
  );

  const handleDelete = useCallback(async (starter: NoteTypeStarter) => {
    if (
      globalThis.window !== undefined &&
      !globalThis.confirm(`Delete "${starter.name}"? This cannot be undone.`)
    ) {
      return;
    }
    try {
      await deleteUserTemplate(starter.id);
      setStarters((current) =>
        (current ?? []).filter((s) => s.id !== starter.id)
      );
      setUserIds((current) => {
        const next = new Set(current);
        next.delete(starter.id);
        return next;
      });
    } catch (error: unknown) {
      setDownloadError(
        error instanceof Error ? error.message : 'Could not delete template'
      );
    }
  }, []);

  const handleDownload = useCallback(async (starter: NoteTypeStarter) => {
    setDownloadError(null);
    setBusyId(starter.id);
    try {
      await triggerDownload(starter);
    } catch (error: unknown) {
      setDownloadError(
        error instanceof Error
          ? error.message
          : 'Could not generate .apkg — try again.'
      );
    } finally {
      setBusyId(null);
    }
  }, []);

  return (
    <div className={sharedStyles.page}>
      <Helmet>
        <title>Note types — 2anki</title>
      </Helmet>
      <header className={`${sharedStyles.pageHeader} ${styles.pageHeaderRow}`}>
        <div>
          <h1 className={sharedStyles.title}>Note types</h1>
          <p className={sharedStyles.subtitle}>
            Starter Anki note types you can drop in or customize. Open the .apkg in Anki to import.
          </p>
        </div>
        <Link
          to="/templates/new"
          className={`${sharedStyles.btnPrimary} ${sharedStyles.btnInline}`}
        >
          New note type
        </Link>
      </header>

      {loadError && (
        <div className={styles.error} role="alert">
          Could not load note types. {loadError}
        </div>
      )}
      {downloadError && (
        <div className={styles.error} role="alert">
          {downloadError}
        </div>
      )}

      {starters?.length === 0 && !loadError && (
        <div className={styles.empty}>
          No starter note types are available right now.
        </div>
      )}

      {ownedStarters.length > 0 && (
        <section
          className={styles.section}
          aria-labelledby="your-note-types-heading"
        >
          <h2
            id="your-note-types-heading"
            className={styles.sectionHeading}
          >
            Your note types
          </h2>
          <div className={styles.grid}>
            {ownedStarters.map((starter) => (
              <NoteTypeCard
                key={starter.id}
                starter={starter}
                ownedByUser
                busy={busyId === starter.id}
                onDownload={handleDownload}
                onPreview={setPreviewed}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </section>
      )}
      {defaultStarters.length > 0 && (
        <section
          className={styles.section}
          aria-labelledby="starter-note-types-heading"
        >
          <h2
            id="starter-note-types-heading"
            className={styles.sectionHeading}
          >
            Starter note types
          </h2>
          <div className={styles.grid}>
            {defaultStarters.map((starter) => (
              <NoteTypeCard
                key={starter.id}
                starter={starter}
                ownedByUser={false}
                busy={busyId === starter.id}
                onDownload={handleDownload}
                onPreview={setPreviewed}
              />
            ))}
          </div>
        </section>
      )}
      {officialStarters.length > 0 && (
        <section
          className={styles.section}
          aria-labelledby="official-note-types-heading"
        >
          <h2
            id="official-note-types-heading"
            className={styles.sectionHeading}
          >
            Official 2anki templates
          </h2>
          <div className={styles.grid}>
            {officialStarters.map((starter) => (
              <NoteTypeCard
                key={starter.id}
                starter={starter}
                ownedByUser={false}
                busy={busyId === starter.id}
                onDownload={handleDownload}
                onPreview={setPreviewed}
              />
            ))}
          </div>
        </section>
      )}

      {previewed && (
        <PreviewModal
          starter={previewed}
          onClose={() => setPreviewed(null)}
        />
      )}
    </div>
  );
}

export default TemplatesPage;
