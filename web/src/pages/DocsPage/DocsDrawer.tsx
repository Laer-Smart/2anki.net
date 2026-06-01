import { useEffect } from 'react';
import { DocsSidebar } from './DocsSidebar';
import styles from './DocsPage.module.css';

interface DocsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: () => void;
  activeSlug: string;
}

export function DocsDrawer({
  isOpen,
  onClose,
  onSearch,
  activeSlug,
}: Readonly<DocsDrawerProps>) {
  useEffect(() => {
    if (!isOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className={styles.drawerOverlay} role="dialog" aria-modal="true">
      <button
        type="button"
        className={styles.drawerBackdrop}
        onClick={onClose}
        aria-label="Close menu"
      />
      <div className={styles.drawer}>
        <div className={styles.drawerHeader}>
          <span className={styles.drawerTitle}>Documentation</span>
          <button
            type="button"
            className={styles.drawerClose}
            onClick={onClose}
            aria-label="Close menu"
          >
            ×
          </button>
        </div>
        <DocsSidebar
          isDrawer
          onNavigate={onClose}
          onSearch={onSearch}
          activeSlug={activeSlug}
        />
      </div>
    </div>
  );
}
