import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from '../styles/shared.module.css';

interface Props {
  text: string;
}

export function FieldHint({ text }: Readonly<Props>) {
  const { t } = useTranslation('chrome');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (
        ref.current &&
        e.target instanceof Node &&
        !ref.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  return (
    <div ref={ref} className={styles.infoAnchor}>
      <button
        type="button"
        className={styles.infoButton}
        aria-label={open ? t('fieldHint.hide') : text}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="7" cy="7" r="6.5" stroke="currentColor" />
          <path
            d="M7 6v4"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.25"
          />
          <circle cx="7" cy="4.25" r="0.625" fill="currentColor" />
        </svg>
      </button>
      {open && (
        <div className={styles.infoPopover} role="tooltip">
          {text}
        </div>
      )}
    </div>
  );
}
