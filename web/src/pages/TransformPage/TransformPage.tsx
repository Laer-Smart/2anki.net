import { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useLocation } from 'react-router-dom';

import { useUserLocals } from '../../lib/hooks/useUserLocals';
import { isPayingUser } from '../../components/NavigationBar/helpers/getPlanLabel';
import { track } from '../../lib/analytics/track';
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
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [cardCount, setCardCount] = useState<number>(0);
  const [fieldNames, setFieldNames] = useState<string[]>([]);
  const [sourceField, setSourceField] = useState<number>(0);
  const [targetField, setTargetField] = useState<number>(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (incomingFile == null) return;
    track('transform_apkg_handoff_received', {
      props: { source: 'upload_reject' },
    });
  }, [incomingFile]);

  useEffect(() => {
    if (file == null) {
      setFieldNames([]);
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
      .then((payload: { fieldNames?: unknown }) => {
        const names = Array.isArray(payload.fieldNames)
          ? payload.fieldNames.filter((v): v is string => typeof v === 'string')
          : [];
        setFieldNames(names);
        if (names.length > 0) {
          setSourceField(0);
          setTargetField(Math.max(0, names.length - 1));
        }
      })
      .catch(() => {
        setFieldNames([]);
      });
    return () => controller.abort();
  }, [file]);

  const supportsFieldPicker =
    transform === 'translate_back' || transform === 'add_image';
  const showFieldPicker = supportsFieldPicker && fieldNames.length > 0;

  const reset = () => {
    setFile(null);
    setStatus('idle');
    setError(null);
    setCardCount(0);
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
    track('transform_apkg_submitted', { props: { transform } });

    const body = new FormData();
    body.append('file', file);
    body.append('transform', transform);
    if (transform === 'translate_back') body.append('targetLanguage', language);
    if (transform === 'add_image') body.append('imageSource', imageSource);
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
        return;
      }
      if (!response.ok) {
        const text = await response.text();
        setError(text || 'Transform failed. Try again.');
        setStatus('error');
        return;
      }

      const count = Number(response.headers.get('X-Card-Count') ?? '0');
      setCardCount(Number.isFinite(count) ? count : 0);
      const filename = response.headers.get('File-Name');
      const blob = await response.blob();
      const decodedName = filename ? decodeURIComponent(filename) : `${file.name.replace(/\.apkg$/i, '')}-transformed.apkg`;
      downloadBlob(blob, decodedName);
      setStatus('done');
      track('transform_apkg_succeeded', { props: { transform, card_count: count } });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Transform failed. Try again.';
      setError(message);
      setStatus('error');
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
          <p>Translate, add examples, add hints, and more — on the paid plan.</p>
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

        {showFieldPicker && (
          <div className={pageStyles.fieldPicker}>
            <label className={pageStyles.languageRow}>
              Source field
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
              Target field
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
          disabled={file == null || status === 'transforming'}
        >
          {status === 'transforming' ? 'Transforming' : 'Transform'}
        </button>
      </form>

      {status === 'transforming' && (
        <p role="status" className={pageStyles.status}>
          Working through every note. A 900-card deck takes about 5 to 10 minutes.
        </p>
      )}

      {status === 'done' && (
        <div
          role="status"
          className={`${pageStyles.status} ${styles.notificationSuccess}`}
        >
          <p>{cardCount} cards. Downloaded.</p>
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
