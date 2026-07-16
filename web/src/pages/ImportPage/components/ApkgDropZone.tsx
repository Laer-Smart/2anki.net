import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from '../ImportPage.module.css';

interface ApkgDropZoneProps {
  file: File | null;
  onFileSelected: (file: File) => void;
  onFileRejected: (message: string) => void;
  disabled: boolean;
}

function isApkgFile(file: File): boolean {
  return file.name.toLowerCase().endsWith('.apkg');
}

export default function ApkgDropZone({
  file,
  onFileSelected,
  onFileRejected,
  disabled,
}: Readonly<ApkgDropZoneProps>) {
  const { t } = useTranslation('tools');
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (f: File) => {
      if (isApkgFile(f)) {
        onFileSelected(f);
      } else {
        onFileRejected(t('import.notAnkiDeck'));
      }
    },
    [onFileSelected, onFileRejected, t]
  );

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setDragOver(false);
      if (disabled) return;
      const droppedFile = event.dataTransfer.files[0];
      if (droppedFile) {
        handleFile(droppedFile);
      }
    },
    [disabled, handleFile]
  );

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = event.target.files?.[0];
      if (selectedFile) {
        handleFile(selectedFile);
      }
    },
    [handleFile]
  );

  const handleClick = useCallback(() => {
    if (!disabled) {
      inputRef.current?.click();
    }
  }, [disabled]);

  return (
    <div
      className={`${styles.dropZone} ${dragOver ? styles.dropZoneActive : ''} ${
        file ? styles.dropZoneHasFile : ''
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') handleClick();
      }}
      role="button"
      tabIndex={0}
      aria-label={t('import.dropAriaLabel')}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".apkg"
        onChange={handleChange}
        hidden
        disabled={disabled}
      />
      {file ? (
        <p className={styles.dropZoneFileName}>{file.name}</p>
      ) : (
        <>
          <p className={styles.dropZoneTitle}>{t('import.dropTitle')}</p>
          <p className={styles.dropZoneSubtitle}>{t('import.dropSubtitle')}</p>
        </>
      )}
    </div>
  );
}
