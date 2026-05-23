import { useRef, useState } from 'react';

import { useUserLocals } from '../../lib/hooks/useUserLocals';
import { isPayingUser } from '../../components/NavigationBar/helpers/getPlanLabel';
import { track } from '../../lib/analytics/track';
import styles from '../../styles/shared.module.css';
import pageStyles from './PhotoToFlashcardsPage.module.css';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

type Status = 'idle' | 'reading' | 'done';
type UploadSource = 'camera' | 'library';
type Density = 'sparse' | 'balanced' | 'dense';
type PhotoMode = 'generative' | 'verbatim';

const DENSITY_OPTIONS: ReadonlyArray<{ value: Density; label: string; range: string }> = [
  { value: 'sparse', label: 'Sparse', range: '3–5' },
  { value: 'balanced', label: 'Balanced', range: '6–10' },
  { value: 'dense', label: 'Dense', range: '12–20' },
];

const DENSITY_STORAGE_KEY = 'photoToFlashcards.density';

function readStoredDensity(): Density {
  if (typeof window === 'undefined') return 'balanced';
  const stored = window.localStorage.getItem(DENSITY_STORAGE_KEY);
  return stored === 'sparse' || stored === 'dense' ? stored : 'balanced';
}

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
  const [uploadSource, setUploadSource] = useState<UploadSource>('library');
  const [includeSourceImage, setIncludeSourceImage] = useState(true);
  const [density, setDensity] = useState<Density>(readStoredDensity);
  const [mode, setMode] = useState<PhotoMode>('generative');
  const [verbatimEmptyState, setVerbatimEmptyState] = useState(false);
  const card1Ref = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFile(null);
    setPreviewUrl(null);
    setStatus('idle');
    setCardCount(0);
    setError(null);
    setVerbatimEmptyState(false);
  };

  const handleFile = (next: File, source: UploadSource) => {
    setError(null);
    if (!ALLOWED_TYPES.includes(next.type)) {
      setError('Use JPEG, PNG, WebP, or GIF.');
      return;
    }
    if (next.size > MAX_SIZE_BYTES) {
      setError('Photo is over the 10 MB limit. Try a smaller image.');
      return;
    }
    setUploadSource(source);
    setFile(next);
    setPreviewUrl(URL.createObjectURL(next));
    setStatus('idle');
    setCardCount(0);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.files?.[0];
    if (next != null) handleFile(next, 'library');
  };

  const handleCameraInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.files?.[0];
    if (next != null) handleFile(next, 'camera');
  };

  const handleDensitySelect = (next: Density) => {
    setDensity(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(DENSITY_STORAGE_KEY, next);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    const next = e.dataTransfer.files[0];
    if (next != null) handleFile(next, 'library');
  };

  const switchToGenerative = () => {
    setMode('generative');
    setVerbatimEmptyState(false);
    card1Ref.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  };

  const handleConvert = async () => {
    if (file == null) {
      setError('Select a photo first.');
      return;
    }
    setError(null);
    setVerbatimEmptyState(false);
    setStatus('reading');
    track('photo_upload_started', { source: uploadSource });

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
          includeSourceImage,
          density,
          mode,
        }),
      });

      if (res.status === 404) {
        setError("Photo to deck isn't available yet.");
        setStatus('idle');
        return;
      }
      if (res.status === 401 || res.status === 403) {
        setError('Sign in to use photo to deck.');
        setStatus('idle');
        return;
      }
      if (res.status === 413) {
        setError('Photo is too large. Try a smaller or lower-resolution image.');
        setStatus('idle');
        return;
      }
      if (res.status === 429) {
        const body = (await res.json().catch(() => ({}))) as {
          used?: number;
          limit?: number;
        };
        const limit = body.limit ?? 5;
        const used = body.used ?? limit;
        track('photo_quota_reached', { used, limit });
        setError(`Free plan is ${limit} photos per month. Upgrade for unlimited.`);
        setStatus('idle');
        return;
      }
      if (!res.ok) {
        const body = (await res.json().catch(() => ({ message: res.statusText }))) as {
          message?: string;
        };
        setError(body.message ?? "Couldn't read this photo. Try again.");
        setStatus('idle');
        return;
      }

      const count = Number(res.headers.get('X-Card-Count') ?? '0');
      const blob = await res.blob();
      downloadBlob(blob, `${name}.apkg`);
      setCardCount(count);
      setStatus('done');

      if (mode === 'verbatim' && count === 0) {
        setVerbatimEmptyState(true);
      }
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
          {!isPaying && ' Free plan: 5 photos per month.'}
        </p>
      </header>

      <div ref={card1Ref} className={styles.sectionCard} data-section-card>
        <p className={pageStyles.cardLabel}>Choose a mode</p>
        <div
          className={pageStyles.modeGroup}
          role="radiogroup"
          aria-label="Conversion mode"
        >
          <button
            type="button"
            role="radio"
            aria-label="Generate cards"
            aria-checked={mode === 'generative'}
            className={`${pageStyles.modeCard} ${mode === 'generative' ? pageStyles.modeCardActive : ''}`}
            onClick={() => setMode('generative')}
          >
            <span className={pageStyles.modeCardTitle} aria-hidden>Generate cards</span>
            {mode === 'generative' && (
              <span className={pageStyles.modeCardHelper}>
                Works on any notes, textbook pages, or slides — AI writes the questions.
              </span>
            )}
          </button>
          <button
            type="button"
            role="radio"
            aria-label="Copy existing questions"
            aria-checked={mode === 'verbatim'}
            className={`${pageStyles.modeCard} ${mode === 'verbatim' ? pageStyles.modeCardActive : ''}`}
            onClick={() => setMode('verbatim')}
          >
            <span className={pageStyles.modeCardTitle} aria-hidden>Copy existing questions</span>
            {mode === 'verbatim' && (
              <span className={pageStyles.modeCardHelper}>
                Photo already has Q&amp;A or MCQs? Cards are copied exactly as written.
              </span>
            )}
          </button>
        </div>
      </div>

      <div className={styles.sectionCard} data-section-card>
        <p className={pageStyles.cardLabel}>Your photo</p>

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

        <div className={pageStyles.cameraButtonContainer}>
          <button
            type="button"
            className={pageStyles.cameraButton}
            onClick={() => cameraInputRef.current?.click()}
          >
            Take a photo
          </button>
          <input
            ref={cameraInputRef}
            id="photo-camera-input"
            type="file"
            accept={ALLOWED_TYPES.join(',')}
            capture="environment"
            onChange={handleCameraInput}
            hidden
          />
        </div>

        <p className={pageStyles.dropzoneLabel}>or pick from your photos</p>

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
      </div>

      <div className={styles.sectionCard} data-section-card>
        <p className={pageStyles.cardLabel}>Options</p>

        {mode === 'generative' && (
          <div className={pageStyles.densityRow}>
            <div
              className={pageStyles.densityGroup}
              role="radiogroup"
              aria-label="Card density"
            >
              {DENSITY_OPTIONS.map(({ value, label, range }) => {
                const isActive = density === value;
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={isActive}
                    className={`${pageStyles.densityChip} ${isActive ? pageStyles.densityChipActive : ''}`}
                    onClick={() => handleDensitySelect(value)}
                  >
                    <span className={pageStyles.densityChipLabel}>{label}</span>
                    <span className={pageStyles.densityChipRange}>{range}</span>
                  </button>
                );
              })}
            </div>
            <p className={pageStyles.densityHint}>How many cards per image.</p>
          </div>
        )}

        <label className={pageStyles.checkboxRow}>
          <input
            type="checkbox"
            checked={includeSourceImage}
            onChange={(e) => setIncludeSourceImage(e.target.checked)}
          />
          Show source image on the back of each card
        </label>

        {error != null && <div className={styles.notificationDanger}>{error}</div>}

        {status === 'done' && !verbatimEmptyState && (
          <div className={styles.notificationSuccess}>
            {cardCount} {cardCount === 1 ? 'card' : 'cards'} from your photo. Deck downloaded.
          </div>
        )}

        {verbatimEmptyState && (
          <div className={styles.notificationWarning}>
            No questions found in this photo.{' '}
            <button
              type="button"
              className={pageStyles.switchModeLink}
              onClick={switchToGenerative}
            >
              Switch to Generate cards
            </button>{' '}
            to have them written for you.
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
            {status === 'reading' ? 'Reading your photo' : 'Get cards'}
          </button>
        </div>
      </div>
    </section>
  );
}
