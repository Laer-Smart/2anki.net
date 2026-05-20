import { useRef, useState } from 'react';

import { useUserLocals } from '../../lib/hooks/useUserLocals';
import { isPayingUser } from '../../components/NavigationBar/helpers/getPlanLabel';
import styles from '../../styles/shared.module.css';
import pageStyles from './PhotoToFlashcardsPage.module.css';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

type Status = 'idle' | 'reading' | 'done';

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1] ?? '');
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read image dimensions'));
    };
    img.src = url;
  });
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function PhotoToFlashcardsPage() {
  const { data } = useUserLocals();
  const isPaying = isPayingUser(data?.locals);

  const [deckName, setDeckName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [cardCount, setCardCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFile(null);
    setPreviewUrl(null);
    setStatus('idle');
    setCardCount(0);
    setError(null);
  };

  const handleFile = (next: File) => {
    setError(null);
    if (!ALLOWED_TYPES.includes(next.type)) {
      setError('Use JPEG, PNG, WebP, or GIF.');
      return;
    }
    if (next.size > MAX_SIZE_BYTES) {
      setError('Photo is over the 10 MB limit. Try a smaller image.');
      return;
    }
    setFile(next);
    setPreviewUrl(URL.createObjectURL(next));
    setStatus('idle');
    setCardCount(0);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.files?.[0];
    if (next != null) handleFile(next);
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    const next = e.dataTransfer.files[0];
    if (next != null) handleFile(next);
  };

  const handleConvert = async () => {
    if (file == null) {
      setError('Select a photo first.');
      return;
    }
    setError(null);
    setStatus('reading');

    try {
      const [imageBase64, dimensions] = await Promise.all([
        fileToBase64(file),
        getImageDimensions(file),
      ]);

      const baseName = file.name.replace(/\.[^.]+$/, '') || 'Photo deck';
      const name = deckName.trim() || baseName;

      const res = await fetch('/api/image-occlusion/photo-to-deck', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          mediaType: file.type,
          deckName: name,
          width: dimensions.width,
          height: dimensions.height,
        }),
      });

      if (res.status === 404) {
        setError('Photo to deck isn’t available yet.');
        setStatus('idle');
        return;
      }
      if (res.status === 403) {
        setError('Ankify access is required for photo to deck.');
        setStatus('idle');
        return;
      }
      if (res.status === 413) {
        setError('Photo is too large. Try a smaller or lower-resolution image.');
        setStatus('idle');
        return;
      }
      if (!res.ok) {
        const body = (await res.json().catch(() => ({ message: res.statusText }))) as {
          message?: string;
        };
        setError(body.message ?? 'Couldn’t read this photo. Try again.');
        setStatus('idle');
        return;
      }

      const count = Number(res.headers.get('X-Card-Count') ?? '0');
      const blob = await res.blob();
      downloadBlob(blob, `${name}.apkg`);
      setCardCount(count);
      setStatus('done');
    } catch {
      setError('Something broke on our end. Try again in a moment.');
      setStatus('idle');
    }
  };

  return (
    <section className={pageStyles.page} aria-label="Photo to deck">
      <header className={pageStyles.pageHeader}>
        <h1 className={pageStyles.pageTitle}>Snap a photo, get cards</h1>
        <p className={pageStyles.pageSubtitle}>
          Works on textbook pages, lecture slides, and handwritten notes.
          {!isPaying && ' Ankify access required.'}
        </p>
      </header>

      <div className={pageStyles.row}>
        <label className={pageStyles.deckNameLabel} htmlFor="photo-deck-name">
          Deck name
        </label>
        <input
          id="photo-deck-name"
          type="text"
          value={deckName}
          onChange={(e) => setDeckName(e.target.value)}
          className={pageStyles.deckNameInput}
          placeholder={file?.name.replace(/\.[^.]+$/, '') || 'Photo deck'}
        />
      </div>

      <label
        className={pageStyles.dropzone}
        htmlFor="photo-file-input"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        {previewUrl == null ? (
          <>
            <span className={pageStyles.dropzoneTitle}>Drop a photo or click to select</span>
            <span className={pageStyles.dropzoneHint}>JPEG, PNG, WebP, GIF — up to 10 MB</span>
          </>
        ) : (
          <img src={previewUrl} alt="Selected photo" className={pageStyles.preview} />
        )}
        <input
          ref={fileInputRef}
          id="photo-file-input"
          type="file"
          accept={ALLOWED_TYPES.join(',')}
          onChange={handleFileInput}
          hidden
        />
      </label>

      {error != null && <div className={styles.notificationDanger}>{error}</div>}

      {status === 'done' && (
        <div className={styles.notificationSuccess}>
          {cardCount} {cardCount === 1 ? 'card' : 'cards'} from your photo. Deck downloaded.
        </div>
      )}

      <div className={pageStyles.footer}>
        <button
          type="button"
          className={styles.btnSecondary}
          onClick={reset}
          disabled={file == null && status === 'idle'}
        >
          Clear
        </button>
        <button
          type="button"
          className={styles.btnPrimary}
          onClick={handleConvert}
          disabled={file == null || status === 'reading'}
        >
          {status === 'reading' ? 'Reading your photo' : 'Get flashcards'}
        </button>
      </div>
    </section>
  );
}
