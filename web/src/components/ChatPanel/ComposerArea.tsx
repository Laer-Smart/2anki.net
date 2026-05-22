import { useRef } from 'react';
import SendIcon from '../icons/SendIcon';
import styles from './ComposerArea.module.css';

const MAX_FILE_COUNT = 5;

type ChipState = 'idle' | 'uploading' | 'failed';

interface AttachmentChip {
  id: string;
  file: File;
  state: ChipState;
  retryCount: number;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function chipIcon(mimeType: string): string {
  return mimeType === 'application/pdf' ? '📄' : '🖼';
}

function truncateName(name: string, max: number): string {
  if (name.length <= max) return name;
  const ext = name.lastIndexOf('.');
  if (ext > 0 && name.length - ext <= 6) {
    const truncated = name.slice(0, max - 3 - (name.length - ext));
    return `${truncated}…${name.slice(ext)}`;
  }
  return `${name.slice(0, max - 1)}…`;
}

interface ComposerAreaProps {
  inputValue: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onAttach: (files: File[]) => void;
  attachedFiles: AttachmentChip[];
  onRemoveFile: (id: string) => void;
  onRetryFile?: (id: string) => void;
  disabled: boolean;
  isDragging?: boolean;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
}

export default function ComposerArea({
  inputValue,
  onChange,
  onSubmit,
  onAttach,
  attachedFiles,
  onRemoveFile,
  onRetryFile,
  disabled,
  isDragging = false,
  onDragOver,
  onDragLeave,
  onDrop,
  textareaRef: externalTextareaRef,
}: ComposerAreaProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const internalRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = externalTextareaRef ?? internalRef;

  const canSend = inputValue.trim().length > 0 && !disabled;

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Escape') {
      e.currentTarget.blur();
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (canSend) {
        onSubmit();
      }
    }
  }

  return (
    <div
      role="region"
      aria-label="Chat composer with file drop zone"
      className={`${styles.composerCard} ${isDragging ? styles.composerCardDragging : ''}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {isDragging && (
        <div className={styles.dropOverlay}>
          <span className={styles.dropOverlayTitle}>Drop to attach</span>
          <span className={styles.dropOverlaySub}>
            PDF or image, up to 10 MB each
          </span>
        </div>
      )}
      {attachedFiles.length > 0 && (
        <div className={styles.chipStrip}>
          {attachedFiles.map((chip) => (
            <div
              key={chip.id}
              className={`${styles.chip} ${chip.state === 'failed' ? styles.chipError : ''}`}
            >
              <span className={styles.chipIcon}>
                {chipIcon(chip.file.type)}
              </span>
              <span className={styles.chipName} title={chip.file.name}>
                {truncateName(chip.file.name, 32)}
              </span>
              <span className={styles.chipSeparator}> · </span>
              {chip.state === 'uploading' && (
                <>
                  <span
                    className={`${styles.chipSize} ${styles.chipSizeError}`}
                  >
                    <span className={styles.spinnerSmall} />
                  </span>
                  <span className={styles.chipSize}>Uploading</span>
                </>
              )}
              {chip.state === 'failed' && (
                <>
                  <span
                    className={`${styles.chipSize} ${styles.chipSizeError}`}
                  >
                    Upload failed
                  </span>
                  {onRetryFile != null && (
                    <button
                      type="button"
                      className={styles.chipRetry}
                      onClick={() => onRetryFile(chip.id)}
                    >
                      Retry
                    </button>
                  )}
                </>
              )}
              {chip.state === 'idle' && (
                <span className={styles.chipSize}>
                  {formatFileSize(chip.file.size)}
                </span>
              )}
              <button
                type="button"
                className={styles.chipRemove}
                aria-label={`Remove ${chip.file.name}`}
                onClick={() => onRemoveFile(chip.id)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <div className={styles.composerBottom}>
        <textarea
          ref={textareaRef}
          className={styles.textarea}
          value={inputValue}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a study question, paste notes, or attach a PDF…"
          disabled={disabled}
          rows={1}
          aria-label="Message input"
        />
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="application/pdf,image/png,image/jpeg,image/gif,image/webp"
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files != null && e.target.files.length > 0) {
              onAttach(Array.from(e.target.files));
            }
            e.target.value = '';
          }}
          aria-hidden="true"
          tabIndex={-1}
        />
        <button
          type="button"
          className={styles.paperclipBtn}
          aria-label="Attach files"
          disabled={disabled || attachedFiles.length >= MAX_FILE_COUNT}
          onClick={() => fileInputRef.current?.click()}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
        </button>
        <button
          type="button"
          className={styles.sendBtn}
          onClick={onSubmit}
          disabled={!canSend}
          aria-label="Send message"
        >
          <SendIcon width={18} height={18} />
        </button>
      </div>
    </div>
  );
}
