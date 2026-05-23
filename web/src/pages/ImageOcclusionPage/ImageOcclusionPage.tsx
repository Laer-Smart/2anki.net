import { useCallback, useEffect, useRef, useState } from 'react';
import { isPayingUser } from '../../components/NavigationBar/helpers/getPlanLabel';
import { get2ankiApi } from '../../lib/backend/get2ankiApi';
import { useUserLocals } from '../../lib/hooks/useUserLocals';
import styles from '../../styles/shared.module.css';
import { ImageQueue } from './components/ImageQueue';
import { NotionImportDrawer } from './components/NotionImportDrawer';
import { OcclusionCanvas } from './components/OcclusionCanvas';
import pageStyles from './ImageOcclusionPage.module.css';
import { ImageEntry, OcclusionRect } from './types';

type Mode = 'hide_all' | 'hide_one';

async function buildDownloadFormData(
  deckName: string,
  mode: Mode,
  entries: ImageEntry[]
): Promise<FormData> {
  const form = new FormData();

  const images = entries.map((entry) => ({
    imageName: entry.imageName,
    header: entry.header,
    s3Key: entry.s3Key ?? undefined,
    rects: entry.rects.map((r) => ({
      x: r.x,
      y: r.y,
      w: r.w,
      h: r.h,
      label: r.label,
      shape: r.shape,
      ...(r.points == null ? {} : { points: r.points }),
      ...(r.groupId == null ? {} : { groupId: r.groupId }),
    })),
  }));

  form.append('data', JSON.stringify({ deckName, mode, images }));

  for (const entry of entries) {
    if (entry.file != null) {
      form.append('images', entry.file, entry.imageName);
    }
  }

  return form;
}

async function uploadImageToServer(
  file: File
): Promise<{ s3Key: string; presignedUrl: string }> {
  const form = new FormData();
  form.append('image', file, file.name);
  const res = await fetch('/api/image-occlusion/draft/image', {
    method: 'POST',
    credentials: 'include',
    body: form,
  });
  if (!res.ok) throw new Error('Image upload failed');
  return res.json() as Promise<{ s3Key: string; presignedUrl: string }>;
}

async function createDraft(
  name: string,
  mode: Mode,
  images: unknown[]
): Promise<string | null> {
  const res = await fetch('/api/image-occlusion/draft', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, mode, images }),
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { id: string };
  return body.id;
}

async function updateDraft(
  id: string,
  name: string,
  mode: Mode,
  images: unknown[]
): Promise<void> {
  await fetch(`/api/image-occlusion/draft/${id}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, mode, images }),
  });
}

async function loadLatestDraft(): Promise<{
  id: string;
  name: string;
  mode: Mode;
  images: Array<{
    s3Key: string;
    imageName: string;
    header: string;
    rects: OcclusionRect[];
    presignedUrl: string;
  }>;
} | null> {
  const listRes = await fetch('/api/image-occlusion/drafts', {
    credentials: 'include',
  });
  if (!listRes.ok) return null;
  const list = (await listRes.json()) as Array<{ id: string }>;
  if (list.length === 0) return null;
  const res = await fetch(`/api/image-occlusion/draft/${list[0].id}`, {
    credentials: 'include',
  });
  if (!res.ok) return null;
  return res.json() as Promise<{
    id: string;
    name: string;
    mode: Mode;
    images: Array<{
      s3Key: string;
      imageName: string;
      header: string;
      rects: OcclusionRect[];
      presignedUrl: string;
    }>;
  } | null>;
}

async function deleteDraft(id: string): Promise<void> {
  await fetch(`/api/image-occlusion/draft/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
}

export function ImageOcclusionPage() {
  const { data } = useUserLocals();
  const isPaying = isPayingUser(data?.locals);
  const isLoggedIn = data?.locals != null;

  const [hydrated, setHydrated] = useState(false);
  const [entries, setEntries] = useState<ImageEntry[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [deckName, setDeckName] = useState('My image deck');
  const [mode, setMode] = useState<Mode>('hide_all');
  const [draftId, setDraftId] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isNotionConnected, setIsNotionConnected] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mobileDismissed, setMobileDismissed] = useState(
    () =>
      typeof window !== 'undefined' &&
      localStorage.getItem('io_mobile_dismissed') === '1'
  );

  useEffect(() => {
    if (mobileDismissed) localStorage.setItem('io_mobile_dismissed', '1');
  }, [mobileDismissed]);

  useEffect(() => {
    if (!isLoggedIn) return;
    get2ankiApi()
      .getNotionConnectionInfo()
      .then((info) => setIsNotionConnected(info.isConnected))
      .catch(() => undefined);
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) {
      setHydrated(true);
      return;
    }
    loadLatestDraft()
      .then((draft) => {
        if (draft == null) {
          setHydrated(true);
          return;
        }
        setDraftId(draft.id);
        setDeckName(draft.name);
        setMode(draft.mode);
        const restored: ImageEntry[] = draft.images.map((img) => ({
          id: crypto.randomUUID(),
          file: null,
          imageName: img.imageName,
          header: img.header,
          rects: img.rects,
          previewUrl: img.presignedUrl,
          s3Key: img.s3Key,
          uploading: false,
        }));
        if (restored.length > 0) setEntries(restored);
        setHydrated(true);
      })
      .catch(() => setHydrated(true));
  }, [isLoggedIn]);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftIdRef = useRef<string | null>(null);
  draftIdRef.current = draftId;

  useEffect(() => {
    if (!hydrated || !isLoggedIn) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const images = entries
        .filter((e) => e.s3Key != null)
        .map((e) => ({
          s3Key: e.s3Key,
          imageName: e.imageName,
          header: e.header,
          rects: e.rects,
        }));
      const currentId = draftIdRef.current;
      if (currentId == null) {
        const newId = await createDraft(deckName, mode, images).catch(
          () => null
        );
        if (newId != null) setDraftId(newId);
      } else {
        await updateDraft(currentId, deckName, mode, images).catch(
          () => undefined
        );
      }
    }, 1000);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [deckName, mode, entries, hydrated, isLoggedIn]);

  const totalCards = entries.reduce((sum, e) => sum + e.rects.length, 0);

  const handleAdd = useCallback(
    (files: File[]) => {
      const newEntries: ImageEntry[] = files.map((file) => {
        return {
          id: crypto.randomUUID(),
          file,
          imageName: file.name,
          header: '',
          rects: [],
          previewUrl: URL.createObjectURL(file),
          s3Key: null,
          uploading: true,
        };
      });

      setEntries((prev) => {
        const next = [...prev, ...newEntries];
        setActiveIndex(next.length - 1);
        return next;
      });

      if (isLoggedIn) {
        for (const entry of newEntries) {
          uploadImageToServer(entry.file as File)
            .then(({ s3Key, presignedUrl }) => {
              setEntries((prev) =>
                prev.map((e) =>
                  e.id === entry.id
                    ? {
                        ...e,
                        s3Key,
                        previewUrl: presignedUrl,
                        uploading: false,
                      }
                    : e
                )
              );
            })
            .catch(() => {
              setEntries((prev) =>
                prev.map((e) =>
                  e.id === entry.id ? { ...e, uploading: false } : e
                )
              );
            });
        }
      } else {
        setEntries((prev) =>
          prev.map((e) =>
            newEntries.some((n) => n.id === e.id)
              ? { ...e, uploading: false }
              : e
          )
        );
      }

    },
    [isLoggedIn]
  );

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = Array.from(e.clipboardData?.items ?? []);
      const imageItems = items.filter((item) => item.type.startsWith('image/'));
      if (imageItems.length === 0) return;
      const files = imageItems
        .map((item) => item.getAsFile())
        .filter((f): f is File => f != null);
      if (files.length > 0) {
        e.preventDefault();
        handleAdd(files);
      }
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [handleAdd]);

  const handleRectsChange = useCallback(
    (rects: OcclusionRect[]) => {
      setEntries((prev) =>
        prev.map((e, i) => (i === activeIndex ? { ...e, rects } : e))
      );
    },
    [activeIndex]
  );

  const handleHeaderChange = useCallback((i: number, header: string) => {
    setEntries((prev) =>
      prev.map((e, idx) => (idx === i ? { ...e, header } : e))
    );
  }, []);

  const handleRemove = useCallback((id: string) => {
    setEntries((prev) => {
      const next = prev.filter((e) => e.id !== id);
      setActiveIndex((cur) => Math.min(cur, Math.max(0, next.length - 1)));
      return next;
    });
  }, []);

  const handleAddFromNotion = useCallback(async (blockIds: string[]) => {
    const placeholders: ImageEntry[] = blockIds.map(
      (id) =>
        ({
          id: crypto.randomUUID(),
          file: null,
          imageName: `notion-${id.slice(0, 8)}`,
          header: '',
          rects: [],
          previewUrl: '',
          s3Key: null,
          uploading: true,
          _notionBlockId: id,
        }) as ImageEntry & { _notionBlockId: string }
    );

    setEntries((prev) => {
      const next = [...prev, ...placeholders];
      setActiveIndex(next.length - 1);
      return next;
    });

    try {
      const res = await fetch('/api/image-occlusion/draft/notion-image', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockIds }),
      });

      if (res.status === 401) {
        setEntries((prev) =>
          prev.filter((e) => !placeholders.some((p) => p.id === e.id))
        );
        setError('Your Notion connection needs a refresh.');
        return;
      }
      if (!res.ok) {
        setEntries((prev) =>
          prev.filter((e) => !placeholders.some((p) => p.id === e.id))
        );
        setError("We couldn't reach Notion just now.");
        return;
      }

      const imported = (await res.json()) as Array<{
        s3Key: string;
        presignedUrl: string;
      }>;

      setEntries((prev) => {
        const withoutPlaceholders = prev.filter(
          (e) => !placeholders.some((p) => p.id === e.id)
        );
        const resolved: ImageEntry[] = imported.map((item, i) => ({
          id: crypto.randomUUID(),
          file: null,
          imageName: placeholders[i]?.imageName ?? `notion-image-${i + 1}`,
          header: '',
          rects: [],
          previewUrl: item.presignedUrl,
          s3Key: item.s3Key,
          uploading: false,
        }));
        const next = [...withoutPlaceholders, ...resolved];
        if (resolved.length > 0) setActiveIndex(next.length - 1);
        return next;
      });
    } catch {
      setEntries((prev) =>
        prev.filter((e) => !placeholders.some((p) => p.id === e.id))
      );
      setError("We couldn't reach Notion just now.");
    }
  }, []);

  const handleDownload = async () => {
    if (entries.length === 0) {
      setError('Add at least one image first.');
      return;
    }
    if (totalCards === 0) {
      setError('Draw at least one mask on an image.');
      return;
    }
    setError(null);
    setIsDownloading(true);
    try {
      const formData = await buildDownloadFormData(deckName, mode, entries);
      const response = await fetch('/api/image-occlusion', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (!response.ok) {
        const body = await response
          .json()
          .catch(() => ({ message: response.statusText }));
        throw new Error(
          (body as { message?: string }).message ?? 'Download failed'
        );
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${deckName}.apkg`;
      a.click();
      URL.revokeObjectURL(url);
      if (isLoggedIn && draftId != null)
        await deleteDraft(draftId).catch(() => undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setIsDownloading(false);
    }
  };

  if (!hydrated) {
    return <div className={pageStyles.pageLayout}>Restoring your session…</div>;
  }

  const activeEntry = entries[activeIndex] ?? null;

  let ctaLabel: string;
  if (isDownloading) {
    ctaLabel = 'Making your deck…';
  } else if (totalCards > 0) {
    ctaLabel = `Download deck (${totalCards} ${totalCards === 1 ? 'card' : 'cards'})`;
  } else {
    ctaLabel = 'Add an image to start';
  }

  return (
    <>
      {!mobileDismissed && (
        <div
          className={`${styles.notificationInfo} ${pageStyles.mobileBanner}`}
        >
          Drawing is easier on a larger screen.{' '}
          <button
            type="button"
            onClick={() => setMobileDismissed(true)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: 0,
            }}
          >
            Continue on this screen anyway
          </button>
        </div>
      )}
      <div
        className={`${pageStyles.pageLayout} ${drawerOpen ? pageStyles.pageLayoutDrawerOpen : ''}`}
      >
        <NotionImportDrawer
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          onImport={handleAddFromNotion}
          isPaying={isPaying}
          currentCount={entries.length}
        />
        <div className={pageStyles.leftPanel}>
          <div className={pageStyles.panelHeader}>
            <label className={pageStyles.deckNameLabel} htmlFor="io-deck-name">
              Deck name
            </label>
            <input
              id="io-deck-name"
              type="text"
              value={deckName}
              onChange={(e) => setDeckName(e.target.value)}
              className={pageStyles.deckNameInput}
              placeholder="My image deck"
            />
          </div>
          <ImageQueue
            entries={entries}
            activeIndex={activeIndex}
            onSelect={setActiveIndex}
            onAdd={handleAdd}
            onRemove={handleRemove}
            onHeaderChange={handleHeaderChange}
            isPaying={isPaying}
            isNotionConnected={isNotionConnected}
            onImportFromNotion={() => setDrawerOpen(true)}
          />
          <div className={pageStyles.panelFooter}>
            <div className={pageStyles.modeToggle}>
              <button
                type="button"
                className={`${styles.btnSecondary} ${mode === 'hide_all' ? pageStyles.modeActive : ''}`}
                onClick={() => setMode('hide_all')}
              >
                Hide all, reveal one
              </button>
              <button
                type="button"
                className={`${styles.btnSecondary} ${mode === 'hide_one' ? pageStyles.modeActive : ''}`}
                onClick={() => setMode('hide_one')}
              >
                Hide one at a time
              </button>
            </div>
            {error != null && (
              <div className={styles.notificationDanger}>
                {`We couldn't make your deck. ${error} Please try again.`}
              </div>
            )}
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={handleDownload}
              disabled={isDownloading || totalCards === 0}
            >
              {ctaLabel}
            </button>
          </div>
        </div>
        <div className={pageStyles.rightPanel}>
          {activeEntry == null ? (
            <div className={pageStyles.emptyCanvas}>
              <p>Add an image from the panel on the left.</p>
              <p>Each box you draw becomes one flashcard.</p>
            </div>
          ) : (
            <OcclusionCanvas
              entry={activeEntry}
              onRectsChange={handleRectsChange}
            />
          )}
        </div>
      </div>
    </>
  );
}
