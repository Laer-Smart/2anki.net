import { useEffect, useMemo, useRef, useState } from 'react';
import { ApkgPreviewCard } from '../../lib/backend/getApkgPreview';
import { fetchMediaAsDataUrl, inlineApkgMedia } from './inlineMedia';
import styles from './PreviewApkgPage.module.css';

interface CardFrameProps {
  card: ApkgPreviewCard;
}

// Card HTML renders in a sandboxed iframe (allow-scripts, no allow-same-origin),
// so its <img> requests to the cookie-authenticated media endpoint go out from a
// null origin without credentials and 401. The authenticated parent fetches the
// media here and inlines it as data: URLs, shared across cards via this cache.
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

export function CardFrame({ card }: Readonly<CardFrameProps>) {
  const [showBack, setShowBack] = useState(false);
  const [frameHeight, setFrameHeight] = useState(DEFAULT_FRAME_HEIGHT);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [srcDoc, setSrcDoc] = useState('');
  const deckSegments = useMemo(() => resolveDeckSegments(card), [card]);

  useEffect(() => {
    let cancelled = false;
    const cardId = String(card.id);
    const html = showBack ? card.back : card.front;
    inlineApkgMedia(html, fetchMediaAsDataUrl, mediaCache).then((inlined) => {
      if (!cancelled) setSrcDoc(buildSrcDoc(inlined, card.css, cardId));
    });
    return () => {
      cancelled = true;
    };
  }, [card, showBack]);

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

  return (
    <section className={styles.card}>
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
        <button
          type="button"
          className={styles.flipButton}
          onClick={() => setShowBack((prev) => !prev)}
          aria-pressed={showBack}
        >
          {showBack ? 'Show front' : 'Show back'}
        </button>
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
    </section>
  );
}
