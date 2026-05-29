import { useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

import { useUserLocals } from '../../lib/hooks/useUserLocals';
import { isPayingUser } from '../../components/NavigationBar/helpers/getPlanLabel';
import { track } from '../../lib/analytics/track';
import styles from '../../styles/shared.module.css';
import pageStyles from './TransformPage.module.css';

type TransformName = 'translate_back' | 'add_example' | 'cloze_front' | 'add_hint';

interface TransformChoice {
  id: TransformName;
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
    description: 'Turns the front into a {{c1::...}} sentence. Emits as Cloze.',
  },
  {
    id: 'add_hint',
    label: 'Add a hint',
    description: 'Adds a one-line hint under the front of every card.',
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
  const isLoggedIn = data?.user?.id != null;

  const [file, setFile] = useState<File | null>(null);
  const [transform, setTransform] = useState<TransformName>('add_hint');
  const [language, setLanguage] = useState<(typeof LANGUAGES)[number]>('English');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [cardCount, setCardCount] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setError('Pick a .apkg file. We only transform Anki decks here.');
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

  if (!isLoggedIn) {
    return (
      <div className={styles.page}>
        <Helmet>
          <title>Transform — 2anki</title>
        </Helmet>
        <header className={styles.pageHeader}>
          <h1 className={styles.title}>Transform an existing deck</h1>
          <p className={styles.subtitle}>
            Sign in to translate, add examples, cloze-ify, or hint every card in a .apkg.
          </p>
        </header>
        <p>
          <Link to="/login">Sign in</Link> or <Link to="/register">create an account</Link> to use Transform.
        </p>
      </div>
    );
  }

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
          <p>Transform is on the paid plan. Upgrade to transform existing decks.</p>
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
        <div role="status" className={pageStyles.status}>
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
