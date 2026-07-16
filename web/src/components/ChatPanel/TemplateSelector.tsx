import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CHAT_TEMPLATE_OPTIONS,
  type ChatCardTemplate,
} from '../../lib/chat/templates';
import styles from './ChatPanel.module.css';

interface TemplateSelectorProps {
  value: ChatCardTemplate;
  onChange: (slug: ChatCardTemplate) => void;
  disabled?: boolean;
}

export function TemplateSelector({
  value,
  onChange,
  disabled,
}: TemplateSelectorProps) {
  const { t } = useTranslation('chat');
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current != null &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeOption =
    CHAT_TEMPLATE_OPTIONS.find((o) => o.slug === value) ??
    CHAT_TEMPLATE_OPTIONS[0];

  return (
    <div className={styles.templateDropdown} ref={dropdownRef}>
      <button
        type="button"
        className={styles.templatePill}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('templateSelector.noteTypeAria', {
          label: activeOption.label,
        })}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
      >
        <span>
          {t('templateSelector.noteTypeLabel', { label: activeOption.label })}
        </span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label={t('templateSelector.listboxLabel')}
          className={styles.templateMenu}
        >
          {CHAT_TEMPLATE_OPTIONS.map((opt) => (
            <li key={opt.slug} role="option" aria-selected={opt.slug === value}>
              <button
                type="button"
                className={`${styles.templateMenuItem} ${opt.slug === value ? styles.templateMenuItemActive : ''}`}
                onClick={() => {
                  onChange(opt.slug);
                  setOpen(false);
                }}
              >
                {opt.label}
                <span className={styles.templateMenuHint}>{opt.fieldHint}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
