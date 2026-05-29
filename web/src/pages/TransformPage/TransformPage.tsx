import { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useLocation } from 'react-router-dom';

import { useUserLocals } from '../../lib/hooks/useUserLocals';
import { isPayingUser } from '../../components/NavigationBar/helpers/getPlanLabel';
import { track } from '../../lib/analytics/track';
import { FieldHint } from '../../components/FieldHint';
import styles from '../../styles/shared.module.css';
import pageStyles from './TransformPage.module.css';

type TransformName =
  | 'translate_back'
  | 'add_example'
  | 'cloze_front'
  | 'add_hint'
  | 'add_image';

type ImageSource = 'pexels' | 'wikimedia';

interface TransformChoice {
  id: TransformName;
  label: string;
  description: string;
}

interface ImageSourceChoice {
  id: ImageSource;
  label: string;
  description: string;
}

const TRANSFORMS: TransformChoice[] = [
  {
    id: 'translate_back',
    label: 'Translate the back field',
    description: 'Pick a target language. Front stays as-is, back is translated.',
  },
  {
    id: 'add_example',
    label: 'Add an example sentence',
    description: 'Appends a short example to the back of every card.',
  },
  {
    id: 'cloze_front',
    label: 'Cloze-ify the front field',
    description: 'Rewrites the front as a fill-in-the-blank card. Good for definitions and vocabulary.',
  },
  {
    id: 'add_hint',
    label: 'Add a hint',
    description: 'Adds a one-line hint under the front of every card.',
  },
  {
    id: 'add_image',
    label: 'Add an image to every card',
    description:
      'Searches a real photo or diagram for each front field and appends it to the back.',
  },
];

const IMAGE_SOURCES: ImageSourceChoice[] = [
  {
    id: 'pexels',
    label: 'Photos (Pexels)',
    description: 'Good for language learning — everyday nouns, places, food, animals.',
  },
  {
    id: 'wikimedia',
    label: 'Diagrams (Wikipedia)',
    description: 'Good for medicine, biology, anatomy, historical figures, specialty terms.',
  },
];

const LANGUAGES = [
  'English',
  'Spanish',
  'French',
  'German',
  'Portuguese',
  'Italian',
  'Dutch',
  'Norwegian',
  'Swedish',
  'Polish',
  'Japanese',
  'Korean',
  'Mandarin Chinese',
  'Arabic',
  'Hindi',
] as const;

type Status = 'idle' | 'transforming' | 'done' | 'error';

function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}s elapsed`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}m ${remaining}s elapsed`;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function TransformPage() {
  const { data } = useUserLocals();
  const isPaying = isPayingUser(data?.locals);

  const location = useLocation();
  const incomingFile =
    location.state &&
    typeof location.state === 'object' &&
    'file' in location.state &&
    location.state.file instanceof File
      ? (location.state.file as File)
      : null;

  const [file, setFile] = useState<File | null>(incomingFile);
  const [transform, setTransform] = useState<TransformName>('add_hint');
  const [language, setLanguage] = useState<(typeof LANGUAGES)[number]>('English');
  const [imageSource, setImageSource] = useState<ImageSource>('pexels');
  const [imageCount, setImageCount] = useState<number>(1);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [cardCount, setCardCount] = useState<number>(0);
  const [fieldNames, setFieldNames] = useState<string[]>([]);
  const [sourceField, setSourceField] = useState<number>(0);
  const [targetField, setTargetField] = useState<number>(1);
  const [previewNoteCount, setPreviewNoteCount] = useState<number | null>(null);
  const [noteCap, setNoteCap] = useState<number>(250);
  const [transformStartedAt, setTransformStartedAt] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const doneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status !== 'done') return;
    doneRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [status]);

  useEffect(() => {
    if (transformStartedAt == null) {
      setElapsedSeconds(0);
      return;
    }
    const tick = () => {
      setElapsedSeconds(
        Math.max(0, Math.floor((Date.now() - transformStartedAt) / 1000))
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [transformStartedAt]);

  useEffect(() => {
    if (incomingFile == null) return;
    track('transform_apkg_handoff_received', {
      props: { source: 'upload_reject' },
    });
  }, [incomingFile]);

  useEffect(() => {
    if (file == null) {
      setFieldNames([]);
      setPreviewNoteCount(null);
      return;
    }
    const controller = new AbortController();
    const body = new FormData();
    body.append('file', file);
    fetch('/api/transform/preview', {
      method: 'POST',
      body,
      credentials: 'include',
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((payload: { fieldNames?: unknown; noteCount?: unknown; noteCap?: unknown }) => {
        const names = Array.isArray(payload.fieldNames)
          ? payload.fieldNames.filter((v): v is string => typeof v === 'string')
          : [];
        setFieldNames(names);
        if (names.length > 0) {
          setSourceField(0);
          setTargetField(Math.max(0, names.length - 1));
        }
        if (typeof payload.noteCount === 'number') {
          setPreviewNoteCount(payload.noteCount);
        }
        if (typeof payload.noteCap === 'number' && payload.noteCap > 0) {
          setNoteCap(payload.noteCap);
        }
      })
      .catch(() => {
        setFieldNames([]);
        setPreviewNoteCount(null);
      });
    return () => controller.abort();
  }, [file]);

  const overCap = previewNoteCount != null && previewNoteCount > noteCap;

  const supportsFieldPicker =
    transform === 'translate_back' || transform === 'add_image';
  const showFieldPicker = supportsFieldPicker && fieldNames.length > 0;

  const reset = () => {
    setFile(null);
    setStatus('idle');
    setError(null);
    setCardCount(0);
    setPreviewNoteCount(null);
    setTransformStartedAt(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFile = (next: File | null) => {
    setError(null);
    if (next == null) {
      setFile(null);
      return;
    }
    if (!next.name.toLowerCase().endsWith('.apkg')) {
      setError('Only .apkg files are supported. Pick an Anki deck file and try again.');
      setFile(null);
      setStatus('error');
      return;
    }
    setFile(next);
    setStatus('idle');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (file == null) return;
    setStatus('transforming');
    setError(null);
    setCardCount(0);
    setTransformStartedAt(Date.now());
    track('transform_apkg_submitted', { props: { transform } });

    const body = new FormData();
    body.append('file', file);
    body.append('transform', transform);
    if (transform === 'translate_back') body.append('targetLanguage', language);
    if (transform === 'add_image') {
      body.append('imageSource', imageSource);
      body.append('imageCount', String(imageCount));
    }
    if (supportsFieldPicker && fieldNames.length > 0) {
      body.append('sourceField', String(sourceField));
      body.append('targetField', String(targetField));
    }

    try {
      const response = await fetch('/api/transform/upload', {
        method: 'POST',
        body,
        credentials: 'include',
      });

      if (response.status === 402) {
        setError('Transform is on the paid plan. Upgrade to transform existing decks.');
        setStatus('error');
        setTransformStartedAt(null);
        return;
      }
      if (!response.ok) {
        const text = await response.text();
        setError(text || 'Transform failed. Try again.');
        setStatus('error');
        setTransformStartedAt(null);
        return;
      }

      const count = Number(response.headers.get('X-Card-Count') ?? '0');
      setCardCount(Number.isFinite(count) ? count : 0);
      const filename = response.headers.get('File-Name');
      const blob = await response.blob();
      const decodedName = filename ? decodeURIComponent(filename) : `${file.name.replace(/\.apkg$/i, '')}-transformed.apkg`;
      downloadBlob(blob, decodedName);
      setStatus('done');
      setTransformStartedAt(null);
      track('transform_apkg_succeeded', { props: { transform, card_count: count } });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Transform failed. Try again.';
      setError(message);
      setStatus('error');
      setTransformStartedAt(null);
    }
  };

  if (!isPaying) {
    return (
      <div className={styles.page}>
        <Helmet>
          <title>Transform — 2anki</title>
        </Helmet>
        <header className={styles.pageHeader}>
          <h1 className={styles.title}>Transform an existing deck</h1>
          <p className={styles.subtitle}>
            Upload a .apkg, pick a transform, get a new deck back.
          </p>
        </header>
        <div className={pageStyles.paywall}>
          <p>
            Transform is on the paid plan — translate, cloze, hint, or
            illustrate every card in a deck you already have.
          </p>
          <Link className={styles.btnPrimary} to="/pricing">See plans</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Helmet>
        <title>Transform — 2anki</title>
      </Helmet>
      <header className={styles.pageHeader}>
        <h1 className={styles.title}>Transform an existing deck</h1>
        <p className={styles.subtitle}>
          Upload a .apkg, pick a transform, get a new deck back. Basic and Cloze decks only in v1.
        </p>
      </header>

      <form onSubmit={handleSubmit} className={pageStyles.form}>
        <label className={pageStyles.dropzone}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".apkg"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            className={pageStyles.fileInput}
          />
          {file == null ? (
            <span>Drop a .apkg or click to pick a file</span>
          ) : (
            <span>{file.name}</span>
          )}
        </label>
        <p className={pageStyles.capHint}>Up to {noteCap} notes per job. v1.</p>

        {overCap && previewNoteCount != null && (
          <p role="alert" className={pageStyles.capWarning}>
            {previewNoteCount} notes — over the {noteCap}-per-job limit. Split
            the deck and run it in batches. Larger decks are coming.
          </p>
        )}

        <fieldset className={pageStyles.fieldset}>
          <legend className={pageStyles.legend}>Transform</legend>
          {TRANSFORMS.map((t) => (
            <label key={t.id} className={pageStyles.choice}>
              <input
                type="radio"
                name="transform"
                value={t.id}
                checked={transform === t.id}
                onChange={() => setTransform(t.id)}
              />
              <span>
                <strong>{t.label}</strong>
                <small>{t.description}</small>
              </span>
            </label>
          ))}
        </fieldset>

        {transform === 'translate_back' && (
          <label className={pageStyles.languageRow}>
            Target language
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as (typeof LANGUAGES)[number])}
            >
              {LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </label>
        )}

        {transform === 'add_image' && (
          <fieldset className={pageStyles.fieldset}>
            <legend className={pageStyles.legend}>Image source</legend>
            {IMAGE_SOURCES.map((s) => (
              <label key={s.id} className={pageStyles.choice}>
                <input
                  type="radio"
                  name="imageSource"
                  value={s.id}
                  checked={imageSource === s.id}
                  onChange={() => setImageSource(s.id)}
                />
                <span>
                  <strong>{s.label}</strong>
                  <small>{s.description}</small>
                </span>
              </label>
            ))}
          </fieldset>
        )}

        {transform === 'add_image' && (
          <label className={pageStyles.languageRow}>
            <span className={pageStyles.fieldLabel}>
              Images per card
              <FieldHint text="How many images to attach to each card. More images take longer to fetch and add to the deck file." />
            </span>
            <select
              value={imageCount}
              onChange={(e) => setImageCount(Number(e.target.value))}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        )}

        {showFieldPicker && (
          <div className={pageStyles.fieldPicker}>
            <label className={pageStyles.languageRow}>
              <span className={pageStyles.fieldLabel}>
                Source field
                <FieldHint
                  text={
                    transform === 'add_image'
                      ? 'The field used as the image-search query. Pick the field that holds the term you want a picture of.'
                      : 'The field the transform reads from. For translation this is the text that gets translated.'
                  }
                />
              </span>
              <select
                value={sourceField}
                onChange={(e) => setSourceField(Number(e.target.value))}
              >
                {fieldNames.map((name, idx) => (
                  <option key={`${idx}-${name}`} value={idx}>
                    {name || `Field ${idx + 1}`}
                  </option>
                ))}
              </select>
            </label>
            <label className={pageStyles.languageRow}>
              <span className={pageStyles.fieldLabel}>
                Target field
                <FieldHint
                  text={
                    transform === 'add_image'
                      ? 'Where the image gets attached. The <img> tag appends to whatever this field already contains.'
                      : 'Where the result lands. For translation, the translated text replaces this field on every card.'
                  }
                />
              </span>
              <select
                value={targetField}
                onChange={(e) => setTargetField(Number(e.target.value))}
              >
                {fieldNames.map((name, idx) => (
                  <option key={`${idx}-${name}`} value={idx}>
                    {name || `Field ${idx + 1}`}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        <button
          type="submit"
          className={styles.btnPrimary}
          disabled={file == null || status === 'transforming' || overCap}
        >
          {status === 'transforming' ? 'Transforming' : 'Transform'}
        </button>
      </form>

      {status === 'transforming' && (
        <div role="status" className={pageStyles.transformingBlock}>
          <div className={pageStyles.progressBar} aria-hidden>
            <div className={pageStyles.progressFill} />
          </div>
          <p className={pageStyles.status}>
            Working through every note. {formatElapsed(elapsedSeconds)}.
          </p>
        </div>
      )}

      {status === 'done' && (
        <div
          ref={doneRef}
          role="status"
          className={`${pageStyles.status} ${styles.notificationSuccess} ${pageStyles.doneBlock}`}
        >
          <div className={pageStyles.doneHeader}>
            <span aria-hidden className={pageStyles.doneCheck}>
              ✓
            </span>
            <p className={pageStyles.doneTitle}>
              {cardCount} cards transformed and downloaded
            </p>
          </div>
          <p className={pageStyles.doneBody}>
            Check your Downloads folder for the new .apkg.
          </p>
          <button type="button" className={pageStyles.linkButton} onClick={reset}>
            Transform another deck
          </button>
        </div>
      )}

      {status === 'error' && error != null && (
        <p role="alert" className={pageStyles.error}>
          {error}
        </p>
      )}
    </div>
  );
}

export default TransformPage;
