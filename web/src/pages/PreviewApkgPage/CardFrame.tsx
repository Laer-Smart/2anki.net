import { useEffect, useMemo, useRef, useState } from 'react';
import { ApkgPreviewCard } from '../../lib/backend/getApkgPreview';
import { CardEditState } from './cardEditTypes';
import { fetchMediaAsDataUrl, inlineApkgMedia } from './inlineMedia';
import styles from './PreviewApkgPage.module.css';

interface CardFrameProps {
  card: ApkgPreviewCard;
  cardIndex?: number;
  editState?: CardEditState;
  onEdit?: (index: number, state: CardEditState) => void;
  isEditable?: boolean;
}

const mediaCache = new Map<string, string | null>();

function buildSrcDoc(html: string, css: string, cardId: string): string {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="color-scheme" content="light dark">
<base target="_blank">
<style>
  html, body { margin: 0; padding: 1rem; font-family: system-ui, sans-serif; }
  img, video { max-width: 100%; height: auto; }
${css}
</style>
</head>
<body>
<div class="card">${html}</div>
<script>
(function () {
  var cardId = ${JSON.stringify(cardId)};
  function post() {
    window.parent.postMessage(
      { source: '2anki-preview', cardId: cardId, height: document.documentElement.scrollHeight },
      '*'
    );
  }
  window.addEventListener('load', post);
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(post).observe(document.documentElement);
  }
})();
</script>
</body>
</html>`;
}

function resolveDeckSegments(card: ApkgPreviewCard): string[] {
  if (Array.isArray(card.deckPath) && card.deckPath.length > 0) {
    return card.deckPath;
  }
  if (card.deckName) return card.deckName.split('::');
  return [];
}

const MAX_FRAME_HEIGHT = 2000;
const DEFAULT_FRAME_HEIGHT = 320;

export function CardFrame({
  card,
  cardIndex,
  editState,
  onEdit,
  isEditable,
}: Readonly<CardFrameProps>) {
  const [showBack, setShowBack] = useState(false);
  const [frameHeight, setFrameHeight] = useState(DEFAULT_FRAME_HEIGHT);
  const [editingFront, setEditingFront] = useState(false);
  const [editingBack, setEditingBack] = useState(false);
  const [draftFront, setDraftFront] = useState('');
  const [draftBack, setDraftBack] = useState('');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [srcDoc, setSrcDoc] = useState('');
  const deckSegments = useMemo(() => resolveDeckSegments(card), [card]);

  const isDeleted = editState?.deleted ?? false;
  const isSuspended = editState?.suspended ?? false;
  const effectiveFront = editState?.front ?? card.front;
  const effectiveBack = editState?.back ?? card.back;

  useEffect(() => {
    let cancelled = false;
    const cardId = String(card.id);
    const html = showBack ? effectiveBack : effectiveFront;
    inlineApkgMedia(html, fetchMediaAsDataUrl, mediaCache).then((inlined) => {
      if (!cancelled) setSrcDoc(buildSrcDoc(inlined, card.css, cardId));
    });
    return () => {
      cancelled = true;
    };
  }, [card, showBack, effectiveFront, effectiveBack]);

  useEffect(() => {
    setFrameHeight(DEFAULT_FRAME_HEIGHT);
  }, [card.id, showBack]);

  useEffect(() => {
    const cardId = String(card.id);
    function handleMessage(event: MessageEvent) {
      if (event.origin !== 'null') return;
      if (event.source !== iframeRef.current?.contentWindow) return;
      const data = event.data;
      if (
        data?.source !== '2anki-preview' ||
        data?.cardId !== cardId ||
        typeof data?.height !== 'number'
      )
        return;
      setFrameHeight(Math.min(data.height, MAX_FRAME_HEIGHT));
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [card.id]);

  function commitFrontEdit() {
    if (onEdit != null && cardIndex != null) {
      onEdit(cardIndex, { ...editState, front: draftFront });
    }
    setEditingFront(false);
  }

  function commitBackEdit() {
    if (onEdit != null && cardIndex != null) {
      onEdit(cardIndex, { ...editState, back: draftBack });
    }
    setEditingBack(false);
  }

  function handleFrontKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      commitFrontEdit();
    }
    if (e.key === 'Escape') {
      setEditingFront(false);
    }
  }

  function handleBackKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      commitBackEdit();
    }
    if (e.key === 'Escape') {
      setEditingBack(false);
    }
  }

  function toggleDelete() {
    if (onEdit != null && cardIndex != null) {
      onEdit(cardIndex, { ...editState, deleted: !isDeleted });
    }
  }

  function toggleSuspend() {
    if (onEdit != null && cardIndex != null) {
      onEdit(cardIndex, { ...editState, suspended: !isSuspended });
    }
  }

  return (
    <section className={`${styles.card}${isDeleted ? ` ${styles.cardDeleted}` : ''}`}>
      <header className={styles.cardHeader}>
        <div className={styles.cardDeckPath}>
          {deckSegments.map((segment, idx) => (
            <span key={`${segment}-${idx}`} className={styles.cardDeckSegment}>
              {idx > 0 && (
                <span className={styles.cardDeckSeparator} aria-hidden="true">
                  ›
                </span>
              )}
              {segment}
            </span>
          ))}
          <span className={styles.cardDot} aria-hidden="true">
            ·
          </span>
          <span className={styles.cardTemplate}>{card.templateName}</span>
        </div>
        <div className={styles.cardControls}>
          {isEditable && (
            <>
              <button
                type="button"
                className={`${styles.iconButton}${isSuspended ? ` ${styles.iconButtonActive}` : ''}`}
                onClick={toggleSuspend}
                aria-pressed={isSuspended}
                title="Suspend on import"
              >
                Suspend
              </button>
              <button
                type="button"
                className={`${styles.iconButton}${isDeleted ? ` ${styles.iconButtonActive}` : ''}`}
                onClick={toggleDelete}
                aria-pressed={isDeleted}
                title={isDeleted ? 'Restore card' : 'Delete card'}
              >
                {isDeleted ? 'Restore' : 'Delete'}
              </button>
            </>
          )}
          <button
            type="button"
            className={styles.flipButton}
            onClick={() => setShowBack((prev) => !prev)}
            aria-pressed={showBack}
          >
            {showBack ? 'Show front' : 'Show back'}
          </button>
        </div>
      </header>
      <iframe
        ref={iframeRef}
        className={styles.cardFrame}
        title={`${card.deckName} / ${card.templateName} (${
          showBack ? 'back' : 'front'
        })`}
        sandbox="allow-scripts"
        srcDoc={srcDoc}
        style={{ height: frameHeight }}
      />
      {isEditable && (
        <div className={styles.editPanel}>
          <div className={styles.editFieldGroup}>
            <label className={styles.editLabel} htmlFor={`front-${card.id}`}>
              Front
            </label>
            {editingFront ? (
              <textarea
                id={`front-${card.id}`}
                className={styles.editableField}
                value={draftFront}
                onChange={(e) => setDraftFront(e.target.value)}
                onKeyDown={handleFrontKeyDown}
                onBlur={commitFrontEdit}
                autoFocus
              />
            ) : (
              <button
                type="button"
                className={styles.iconButton}
                onClick={() => {
                  setDraftFront(editState?.front ?? card.front);
                  setEditingFront(true);
                }}
              >
                Edit front
              </button>
            )}
          </div>
          <div className={styles.editFieldGroup}>
            <label className={styles.editLabel} htmlFor={`back-${card.id}`}>
              Back
            </label>
            {editingBack ? (
              <textarea
                id={`back-${card.id}`}
                className={styles.editableField}
                value={draftBack}
                onChange={(e) => setDraftBack(e.target.value)}
                onKeyDown={handleBackKeyDown}
                onBlur={commitBackEdit}
                autoFocus
              />
            ) : (
              <button
                type="button"
                className={styles.iconButton}
                onClick={() => {
                  setDraftBack(editState?.back ?? card.back);
                  setEditingBack(true);
                }}
              >
                Edit back
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
