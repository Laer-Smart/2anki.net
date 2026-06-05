import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { useUserLocals } from '../../lib/hooks/useUserLocals';
import { isPayingUser } from '../../components/NavigationBar/helpers/getPlanLabel';
import { track } from '../../lib/analytics/track';
import styles from '../../styles/shared.module.css';
import pageStyles from './PhotoToFlashcardsPage.module.css';
import {
  prepareImageForVision,
  type PreparedImage,
} from '../../lib/image/prepareImageForVision';

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
];
const PICKER_ACCEPT = [...ALLOWED_TYPES, '.heic', '.heif'].join(',');
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

type Status = 'idle' | 'reading' | 'done';
type UploadSource = 'camera' | 'library';
type Density = 'sparse' | 'balanced' | 'dense';
type PhotoMode = 'generative' | 'verbatim';

interface SelectedPhoto {
  id: string;
  file: File;
  previewUrl: string;
}

const MIN_CARDS = 1;
const MAX_CARDS = 20;
const DEFAULT_CARDS = 10;

const CARD_COUNT_STORAGE_KEY = 'photoToFlashcards.cardCount';
const MCQ_ENABLED_STORAGE_KEY = 'photoToFlashcards.mcqEnabled';

function readStoredCardCount(): number {
  if (typeof window === 'undefined') return DEFAULT_CARDS;
  const stored = Number(window.localStorage.getItem(CARD_COUNT_STORAGE_KEY));
  if (!Number.isFinite(stored) || stored < MIN_CARDS || stored > MAX_CARDS) {
    return DEFAULT_CARDS;
  }
  return Math.round(stored);
}

function readStoredMcqEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(MCQ_ENABLED_STORAGE_KEY) === 'true';
}

function cardCountToDensity(count: number): Density {
  if (count <= 5) return 'sparse';
  if (count <= 10) return 'balanced';
  return 'dense';
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

function makePhotoId(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `photo-${Date.now()}-${hex}`;
}

function validatePhoto(file: File): string | null {
  if (file.size > MAX_SIZE_BYTES) {
    return 'Photo is over the 10 MB limit. Try a smaller image.';
  }
  if (file.type !== '' && !ALLOWED_TYPES.includes(file.type)) {
    return 'Use a photo format like JPEG, PNG, WebP, GIF, or HEIC.';
  }
  return null;
}

export function PhotoToFlashcardsPage() {
  const { data } = useUserLocals();
  const isPaying = isPayingUser(data?.locals);

  const [deckName, setDeckName] = useState('');
  const [photos, setPhotos] = useState<SelectedPhoto[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const [cardCount, setCardCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadSource, setUploadSource] = useState<UploadSource>('library');
  const [includeSourceImage, setIncludeSourceImage] = useState(true);
  const [targetCardCount, setTargetCardCount] =
    useState<number>(readStoredCardCount);
  const density: Density = cardCountToDensity(targetCardCount);
  const [mode, setMode] = useState<PhotoMode>('generative');
  const [includeMcq, setIncludeMcq] = useState<boolean>(readStoredMcqEnabled);
  const [verbatimEmptyState, setVerbatimEmptyState] = useState(false);
  const card1Ref = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const photoCount = photos.length;

  const resetInputs = () => {
    if (fileInputRef.current != null) fileInputRef.current.value = '';
    if (cameraInputRef.current != null) cameraInputRef.current.value = '';
  };

  const reset = () => {
    photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    setPhotos([]);
    setStatus('idle');
    setCardCount(0);
    setError(null);
    setVerbatimEmptyState(false);
    resetInputs();
  };

  const appendPhotos = (incoming: File[], source: UploadSource) => {
    if (incoming.length === 0) return;
    setError(null);

    const accepted: SelectedPhoto[] = [];
    let rejection: string | null = null;
    for (const file of incoming) {
      const issue = validatePhoto(file);
      if (issue != null) {
        rejection = issue;
        continue;
      }
      accepted.push({
        id: makePhotoId(),
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }

    if (accepted.length === 0) {
      if (rejection != null) setError(rejection);
      resetInputs();
      return;
    }

    if (rejection != null) setError(rejection);
    setUploadSource(source);
    setPhotos((current) => [...current, ...accepted]);
    setStatus('idle');
    setCardCount(0);
    setVerbatimEmptyState(false);
    resetInputs();
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = Array.from(e.target.files ?? []);
    appendPhotos(next, 'library');
  };

  const handleCameraInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = Array.from(e.target.files ?? []);
    appendPhotos(next, 'camera');
  };

  const handleCardCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = Number(e.target.value);
    if (!Number.isFinite(raw)) return;
    const clamped = Math.min(MAX_CARDS, Math.max(MIN_CARDS, Math.round(raw)));
    setTargetCardCount(clamped);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(CARD_COUNT_STORAGE_KEY, String(clamped));
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    const next = Array.from(e.dataTransfer.files ?? []);
    appendPhotos(next, 'library');
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLLabelElement>) => {
    const items = Array.from(e.clipboardData?.files ?? []);
    if (items.length === 0) return;
    e.preventDefault();
    appendPhotos(items, 'library');
  };

  const removePhoto = (id: string) => {
    setPhotos((current) => {
      const removed = current.find((p) => p.id === id);
      if (removed != null) URL.revokeObjectURL(removed.previewUrl);
      return current.filter((p) => p.id !== id);
    });
    setStatus('idle');
    setCardCount(0);
    setVerbatimEmptyState(false);
    setError(null);
  };

  const switchToGenerative = () => {
    setMode('generative');
    setVerbatimEmptyState(false);
    card1Ref.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  };

  const convertOnePhoto = async (
    photo: SelectedPhoto,
    name: string
  ): Promise<{ cardCount: number } | { error: string }> => {
    let prepared: PreparedImage;
    try {
      prepared = await prepareImageForVision(photo.file);
    } catch (decodeError) {
      return {
        error:
          decodeError instanceof Error
            ? decodeError.message
            : 'Could not read the image',
      };
    }

    const res = await fetch('/api/image-occlusion/photo-to-deck', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageBase64: prepared.base64,
        mediaType: prepared.mediaType,
        deckName: name,
        width: prepared.width,
        height: prepared.height,
        includeSourceImage,
        density,
        mode,
        mcqEnabled: includeMcq && isPaying,
      }),
    });

    if (res.status === 404) {
      return { error: "Photo to deck isn't available yet." };
    }
    if (res.status === 401 || res.status === 403) {
      return { error: 'Sign in to use photo to deck.' };
    }
    if (res.status === 413) {
      return {
        error: 'Photo is too large. Try a smaller or lower-resolution image.',
      };
    }
    if (res.status === 429) {
      const body = (await res.json().catch(() => ({}))) as {
        used?: number;
        limit?: number;
      };
      const limit = body.limit ?? 5;
      const used = body.used ?? limit;
      track('photo_quota_reached', { used, limit });
      return {
        error: `Free plan is ${limit} photos per month. Upgrade for unlimited.`,
      };
    }
    if (!res.ok) {
      const body = (await res
        .json()
        .catch(() => ({ message: res.statusText }))) as { message?: string };
      return { error: body.message ?? "Couldn't read this photo. Try again." };
    }

    const count = Number(res.headers.get('X-Card-Count') ?? '0');
    const blob = await res.blob();
    downloadBlob(blob, `${name}.apkg`);
    return { cardCount: count };
  };

  const buildDeckName = (
    photo: SelectedPhoto,
    index: number,
    total: number
  ): string => {
    const trimmed = deckName.trim();
    const fallback = photo.file.name.replace(/\.[^.]+$/, '') || 'Photo deck';
    if (trimmed.length === 0) return fallback;
    return total === 1 ? trimmed : `${trimmed} ${index + 1}`;
  };

  const handleConvert = async () => {
    if (photos.length === 0) {
      setError('Add a photo first.');
      return;
    }
    setError(null);
    setVerbatimEmptyState(false);
    setStatus('reading');
    track('photo_upload_started', { source: uploadSource });

    let totalCards = 0;

    try {
      for (let i = 0; i < photos.length; i += 1) {
        const photo = photos[i];
        const name = buildDeckName(photo, i, photos.length);
        const result = await convertOnePhoto(photo, name);
        if ('error' in result) {
          setError(result.error);
          setStatus('idle');
          return;
        }
        totalCards += result.cardCount;
      }

      setCardCount(totalCards);
      setStatus('done');
      if (mode === 'verbatim' && totalCards === 0) {
        setVerbatimEmptyState(true);
      }
    } catch {
      setError('Something broke on our end. Try again in a moment.');
      setStatus('idle');
    }
  };

  const renderConvertLabel = (): string => {
    if (status === 'reading') {
      return photoCount > 1 ? `Reading ${photoCount} photos` : 'Reading your photo';
    }
    return photoCount > 1 ? `Get cards from ${photoCount} photos` : 'Get cards';
  };

  const renderSuccessLabel = (): string => {
    const cardWord = cardCount === 1 ? 'card' : 'cards';
    if (photoCount > 1) {
      return `${cardCount} ${cardWord} from ${photoCount} photos. Decks downloaded.`;
    }
    return `${cardCount} ${cardWord} from your photo. Deck downloaded.`;
  };

  return (
    <section className={pageStyles.page} aria-label="Photo to deck">
      <header className={styles.pageHeader}>
        <h1 className={styles.title}>Photo to deck</h1>
        <p className={styles.subtitle}>
          Turn a photo of your notes, slides, or textbook into an Anki deck.
          {!isPaying && ' Free plan: 5 photos per month.'}
        </p>
      </header>

      <div ref={card1Ref} className={styles.sectionCard} data-section-card>
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
            <span className={pageStyles.modeCardTitle} aria-hidden>
              Generate cards
            </span>
            <span className={pageStyles.modeCardHelper}>
              Works on any notes, textbook pages, or slides — AI writes the
              questions.
            </span>
          </button>
          <button
            type="button"
            role="radio"
            aria-label="Copy existing questions"
            aria-checked={mode === 'verbatim'}
            className={`${pageStyles.modeCard} ${mode === 'verbatim' ? pageStyles.modeCardActive : ''}`}
            onClick={() => setMode('verbatim')}
          >
            <span className={pageStyles.modeCardTitle} aria-hidden>
              Copy existing questions
            </span>
            <span className={pageStyles.modeCardHelper}>
              Photo already has Q&amp;A or MCQs? Cards are copied exactly as
              written.
            </span>
          </button>
        </div>
      </div>

      <div className={styles.sectionCard} data-section-card>
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
            placeholder={
              photos[0]?.file.name.replace(/\.[^.]+$/, '') || 'Photo deck'
            }
          />
        </div>

        <div className={pageStyles.cameraButtonContainer}>
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={() => cameraInputRef.current?.click()}
          >
            Take a photo
          </button>
          <input
            ref={cameraInputRef}
            id="photo-camera-input"
            type="file"
            accept={PICKER_ACCEPT}
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
          onPaste={handlePaste}
        >
          {photoCount === 0 ? (
            <>
              <span className={pageStyles.dropzoneTitle}>
                Drop photos, paste, or click to add
              </span>
              <span className={pageStyles.dropzoneHint}>
                JPEG, PNG, WebP, GIF, HEIC — up to 10 MB each. Add as many as
                you need.
              </span>
            </>
          ) : (
            <>
              <span className={pageStyles.dropzoneTitle}>
                Add more — drop, paste, or click
              </span>
              <span className={pageStyles.dropzoneHint}>
                {photoCount} {photoCount === 1 ? 'photo' : 'photos'} ready
              </span>
            </>
          )}
          <input
            ref={fileInputRef}
            id="photo-file-input"
            type="file"
            accept={PICKER_ACCEPT}
            multiple
            onChange={handleFileInput}
            hidden
          />
        </label>

        {photoCount > 0 && (
          <ul
            className={pageStyles.thumbnailStrip}
            aria-label={`${photoCount} ${photoCount === 1 ? 'photo' : 'photos'} selected`}
          >
            {photos.map((photo) => (
              <li key={photo.id} className={pageStyles.thumbnail}>
                <img
                  src={photo.previewUrl}
                  alt={photo.file.name}
                  className={pageStyles.thumbnailImage}
                />
                <button
                  type="button"
                  className={pageStyles.thumbnailRemove}
                  aria-label={`Remove ${photo.file.name}`}
                  onClick={(e) => {
                    e.preventDefault();
                    removePhoto(photo.id);
                  }}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {mode === 'generative' && (
        <div className={styles.sectionCard} data-section-card>
          <div className={pageStyles.row}>
            <label
              className={pageStyles.deckNameLabel}
              htmlFor="photo-card-count"
            >
              How many cards?
            </label>
            <input
              id="photo-card-count"
              type="number"
              min={MIN_CARDS}
              max={MAX_CARDS}
              value={targetCardCount}
              onChange={handleCardCountChange}
              className={pageStyles.deckNameInput}
            />
          </div>
          <p className={pageStyles.densityHint}>
            3–5 for a quick pass, 6–10 for typical study, 11–20 for a dense
            page. Applied to each photo.
          </p>
        </div>
      )}

      <div className={styles.sectionCard} data-section-card>
        <label className={pageStyles.checkboxRow}>
          <span className={pageStyles.toggleSwitch}>
            <input
              type="checkbox"
              role="switch"
              checked={includeSourceImage}
              onChange={(e) => setIncludeSourceImage(e.target.checked)}
            />
            <span className={pageStyles.toggleSwitchTrack} aria-hidden />
          </span>
          Show source image on the back of each card
        </label>
        <p className={pageStyles.densityHint}>
          Helpful for diagrams, charts, and handwritten notes.
        </p>

        <label className={pageStyles.checkboxRow}>
          <span className={pageStyles.toggleSwitch}>
            <input
              type="checkbox"
              role="switch"
              checked={isPaying && includeMcq}
              disabled={!isPaying}
              onChange={(e) => {
                const next = e.target.checked;
                setIncludeMcq(next);
                if (typeof window !== 'undefined') {
                  window.localStorage.setItem(
                    MCQ_ENABLED_STORAGE_KEY,
                    String(next)
                  );
                }
              }}
            />
            <span className={pageStyles.toggleSwitchTrack} aria-hidden />
          </span>
          Include multiple-choice questions
        </label>
        <p className={pageStyles.densityHint}>
          {isPaying ? (
            'When the source looks like a quiz, the AI writes options A–D.'
          ) : (
            <>
              <Link
                to="/pricing?from=photo-mcq"
                className={pageStyles.densityHintLink}
              >
                Upgrade
              </Link>{' '}
              for multiple-choice cards — A–D options when the source looks like
              a quiz.
            </>
          )}
        </p>
      </div>

      {error != null && (
        <div className={styles.notificationDanger}>{error}</div>
      )}

      {status === 'done' && !verbatimEmptyState && (
        <div className={styles.notificationSuccess}>{renderSuccessLabel()}</div>
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
          disabled={photoCount === 0 && status === 'idle'}
        >
          Clear
        </button>
        <button
          type="button"
          className={styles.btnPrimary}
          onClick={handleConvert}
          disabled={photoCount === 0 || status === 'reading'}
        >
          {renderConvertLabel()}
        </button>
      </div>
    </section>
  );
}
