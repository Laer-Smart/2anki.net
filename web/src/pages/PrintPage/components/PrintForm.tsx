import { SyntheticEvent, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import formStyles from '../../UploadPage/components/UploadForm/UploadForm.module.css';
import styles from '../../../styles/shared.module.css';

type PrintState = 'idle' | 'uploading' | 'done' | 'error';
type PaperSize = 'A4' | 'Letter' | 'Legal';
type Orientation = 'portrait' | 'landscape';
type Margins = 'narrow' | 'normal' | 'wide';

const WRONG_TYPE_MESSAGE =
  'This tool works with Anki deck files (.apkg). To turn notes into an Anki deck, use the Upload page.';
const CORRUPTED_MESSAGE =
  "Couldn't read this file. Make sure it's a valid Anki deck (.apkg) and try again.";
const GENERIC_ERROR_MESSAGE =
  'Something went wrong while generating the PDF. Try again.';

const CARD_LIMIT_PATTERN = /PDF export supports up to/i;

function isApkgFile(name: string): boolean {
  return /\.apkg$/i.test(name);
}

async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const body = await response.clone().json();
    if (typeof body?.message === 'string' && body.message.trim().length > 0) {
      return body.message;
    }
  } catch {
    /* response not JSON */
  }
  return GENERIC_ERROR_MESSAGE;
}

const AUTH_MESSAGE = 'Log in to use PDF export.';
const UPGRADE_MESSAGE = 'Your free PDF for this month has been used.';

function toUserMessage(serverMessage: string, status: number): string {
  if (status === 401) return AUTH_MESSAGE;
  if (status === 402 || status === 403) return UPGRADE_MESSAGE;
  if (/Invalid .apkg/i.test(serverMessage)) return CORRUPTED_MESSAGE;
  return serverMessage;
}

export default function PrintForm() {
  const [state, setState] = useState<PrintState>('idle');
  const [cardCount, setCardCount] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);
  const [dropHover, setDropHover] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [paperSize, setPaperSize] = useState<PaperSize>('A4');
  const [orientation, setOrientation] = useState<Orientation>('portrait');
  const [margins, setMargins] = useState<Margins>('normal');

  const resetForm = () => {
    setState('idle');
    setCardCount(null);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFile = async (file: File) => {
    if (!isApkgFile(file.name)) {
      setState('error');
      setErrorMessage(WRONG_TYPE_MESSAGE);
      return;
    }

    setState('uploading');
    setErrorMessage(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('backgroundColor', backgroundColor);
    formData.append('paperSize', paperSize);
    formData.append('orientation', orientation);
    formData.append('margins', margins);

    try {
      const response = await globalThis.fetch('/api/apkg/pdf', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = globalThis.URL.createObjectURL(blob);
        const link = document.createElement('a');
        const name = file.name.replace(/\.apkg$/i, '.pdf');
        link.href = url;
        link.download = name;
        link.click();
        globalThis.URL.revokeObjectURL(url);

        setState('done');
        setCardCount(null);
      } else {
        const raw = await extractErrorMessage(response);
        setState('error');
        setErrorMessage(toUserMessage(raw, response.status));
      }
    } catch {
      setState('error');
      setErrorMessage(GENERIC_ERROR_MESSAGE);
    }
  };

  const handleSubmit = async (event: SyntheticEvent) => {
    event.preventDefault();
    const files = fileInputRef.current?.files;
    if (files == null || files.length === 0) return;
    await handleFile(files[0]);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDropHover(false);
    const { dataTransfer } = event;
    if (dataTransfer && dataTransfer.files.length > 0) {
      handleFile(dataTransfer.files[0]);
    }
  };

  const isUploading = state === 'uploading';

  return (
    <form onSubmit={handleSubmit}>
      <div className={styles.field} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <label htmlFor="print-paper-size" className={styles.fieldLabel}>Paper size</label>
          <select
            id="print-paper-size"
            className={styles.select}
            value={paperSize}
            onChange={(e) => setPaperSize(e.target.value as PaperSize)}
          >
            <option value="A4">A4</option>
            <option value="Letter">Letter</option>
            <option value="Legal">Legal</option>
          </select>
        </div>
        <div>
          <label htmlFor="print-orientation" className={styles.fieldLabel}>Orientation</label>
          <select
            id="print-orientation"
            className={styles.select}
            value={orientation}
            onChange={(e) => setOrientation(e.target.value as Orientation)}
          >
            <option value="portrait">Portrait</option>
            <option value="landscape">Landscape</option>
          </select>
        </div>
        <div>
          <label htmlFor="print-margins" className={styles.fieldLabel}>Margins</label>
          <select
            id="print-margins"
            className={styles.select}
            value={margins}
            onChange={(e) => setMargins(e.target.value as Margins)}
          >
            <option value="narrow">Narrow (0.5 cm)</option>
            <option value="normal">Normal (1 cm)</option>
            <option value="wide">Wide (2 cm)</option>
          </select>
        </div>
        <div>
          <label htmlFor="print-bg-color" className={styles.fieldLabel}>Page background</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: '2.375rem' }}>
            <input
              id="print-bg-color"
              type="color"
              value={backgroundColor}
              onChange={(e) => setBackgroundColor(e.target.value)}
              style={{ width: '3rem', height: '2.375rem', padding: '0.125rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', background: 'var(--color-bg-primary)' }}
            />
            <span style={{ color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums', fontSize: '0.875rem' }}>
              {backgroundColor.toUpperCase()}
            </span>
          </div>
        </div>
      </div>
      <label
        htmlFor="print-file"
        className={`${formStyles.dropZone} ${
          dropHover ? formStyles.dropZoneActive : ''
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDropHover(true);
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          setDropHover(true);
        }}
        onDragLeave={() => setDropHover(false)}
        onDrop={handleDrop}
      >
        <span className={formStyles.dropIcon}>🖨️</span>
        <span className={formStyles.dropText}>
          Drop an Anki deck (.apkg) here
        </span>
        <span className={formStyles.dropHint}>or</span>
        <span className={formStyles.convertButton}>
          {isUploading ? 'Making your PDF...' : 'Click to select a file'}
        </span>
        <input
          ref={fileInputRef}
          className={formStyles.fileInput}
          id="print-file"
          type="file"
          accept=".apkg"
          disabled={isUploading}
          onChange={() => submitRef.current?.click()}
        />
      </label>

      {isUploading && (
        <div
          className={styles.notificationInfo}
          style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1rem' }}
        >
          <div className={styles.spinnerSmall} />
          <span>Making your PDF — please keep this tab open until the download starts.</span>
        </div>
      )}

      {state === 'done' && (
        <p className={styles.notificationSuccess}>
          Your flashcards as a PDF{cardCount == null ? '' : ` — ${cardCount} cards`}
        </p>
      )}

      {state === 'error' && errorMessage && (
        <p className={styles.notificationDanger}>
          {errorMessage}
          {errorMessage === WRONG_TYPE_MESSAGE && (
            <>
              {' '}
              <Link to="/upload">Go to Upload</Link>
            </>
          )}
          {errorMessage === UPGRADE_MESSAGE && (
            <>
              {' '}
              <Link to="/pricing">View plans</Link>
            </>
          )}
          {errorMessage === AUTH_MESSAGE && (
            <>
              {' '}
              <Link to="/login">Log in</Link>
            </>
          )}
          {CARD_LIMIT_PATTERN.test(errorMessage) && (
            <>
              {' '}
              <Link to="/pricing">Upgrade for unlimited</Link>
            </>
          )}
        </p>
      )}

      {state === 'done' && (
        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={resetForm}
          >
            Print another deck
          </button>
        </div>
      )}

      <button ref={submitRef} type="submit" className={styles.hidden} />
    </form>
  );
}
