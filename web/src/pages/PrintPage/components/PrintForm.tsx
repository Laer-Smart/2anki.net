import { SyntheticEvent, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './PrintForm.module.css';
import sharedStyles from '../../../styles/shared.module.css';

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
      <div className={styles.optionsGrid}>
        <div>
          <label htmlFor="print-paper-size" className={sharedStyles.fieldLabel}>
            Paper size
          </label>
          <select
            id="print-paper-size"
            className={sharedStyles.select}
            value={paperSize}
            onChange={(e) => setPaperSize(e.target.value as PaperSize)}
          >
            <option value="A4">A4</option>
            <option value="Letter">Letter</option>
            <option value="Legal">Legal</option>
          </select>
        </div>
        <div>
          <label
            htmlFor="print-orientation"
            className={sharedStyles.fieldLabel}
          >
            Orientation
          </label>
          <select
            id="print-orientation"
            className={sharedStyles.select}
            value={orientation}
            onChange={(e) => setOrientation(e.target.value as Orientation)}
          >
            <option value="portrait">Portrait</option>
            <option value="landscape">Landscape</option>
          </select>
        </div>
        <div>
          <label htmlFor="print-margins" className={sharedStyles.fieldLabel}>
            Margins
          </label>
          <select
            id="print-margins"
            className={sharedStyles.select}
            value={margins}
            onChange={(e) => setMargins(e.target.value as Margins)}
          >
            <option value="narrow">Narrow (0.5 cm)</option>
            <option value="normal">Normal (1 cm)</option>
            <option value="wide">Wide (2 cm)</option>
          </select>
        </div>
        <div>
          <label htmlFor="print-bg-color" className={sharedStyles.fieldLabel}>
            Page background
          </label>
          <div className={styles.colorField}>
            <input
              id="print-bg-color"
              type="color"
              value={backgroundColor}
              onChange={(e) => setBackgroundColor(e.target.value)}
              className={styles.colorInput}
            />
            <span className={styles.colorHex}>
              {backgroundColor.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      <label
        htmlFor="print-file"
        className={`${styles.dropZone} ${dropHover ? styles.dropZoneActive : ''}`}
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
        <span className={styles.dropLabel}>Drop an Anki deck (.apkg) here</span>
        <span className={styles.dropHint}>or</span>
        <span className={styles.chooseButton}>
          {isUploading ? 'Making your PDF' : 'Select file'}
        </span>
        <input
          ref={fileInputRef}
          className={styles.fileInput}
          id="print-file"
          type="file"
          accept=".apkg"
          disabled={isUploading}
          onChange={() => submitRef.current?.click()}
        />
      </label>

      {isUploading && (
        <div
          className={sharedStyles.notificationInfo}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginTop: '1rem',
          }}
        >
          <div className={sharedStyles.spinnerSmall} />
          <span>
            Making your PDF — keep this tab open until the download starts.
          </span>
        </div>
      )}

      {state === 'done' && (
        <p className={sharedStyles.notificationSuccess}>
          Your flashcards as a PDF
          {cardCount == null ? '' : ` — ${cardCount} cards`}
        </p>
      )}

      {state === 'error' && errorMessage && (
        <p className={sharedStyles.notificationDanger}>
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
        <div className={styles.doneActions}>
          <button
            type="button"
            className={sharedStyles.btnSecondary}
            onClick={resetForm}
          >
            Print another deck
          </button>
        </div>
      )}

      <button ref={submitRef} type="submit" className={sharedStyles.hidden} />
    </form>
  );
}
