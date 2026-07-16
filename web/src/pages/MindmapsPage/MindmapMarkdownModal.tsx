import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Markdown from 'react-markdown';
import styles from './MindmapMarkdownModal.module.css';

interface MarkdownRow {
  syntax: string;
  rendered: string;
}

interface MindmapMarkdownModalProps {
  onClose: () => void;
}

export function MindmapMarkdownModal({
  onClose,
}: Readonly<MindmapMarkdownModalProps>) {
  const { t } = useTranslation('tools');
  const rows: MarkdownRow[] = [
    { syntax: '**bold**', rendered: t('mindmaps.demoBold') },
    { syntax: '*italic*', rendered: t('mindmaps.demoItalic') },
    { syntax: '`code`', rendered: t('mindmaps.demoCode') },
    { syntax: '# Heading', rendered: t('mindmaps.demoHeading') },
    { syntax: '[text](url)', rendered: t('mindmaps.demoLink') },
  ];
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeBtnRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className={styles.backdrop}>
      <button
        type="button"
        aria-label={t('mindmaps.closeDialog')}
        data-testid="markdown-modal-backdrop"
        className={styles.backdropButton}
        onClick={onClose}
      />
      <dialog
        open
        aria-modal="true"
        aria-labelledby="markdown-modal-title"
        data-testid="markdown-modal-card"
        className={styles.card}
      >
        <div className={styles.header}>
          <h2 id="markdown-modal-title" className={styles.title}>
            {t('mindmaps.markdownTitle')}
          </h2>
          <button
            ref={closeBtnRef}
            type="button"
            aria-label={t('mindmaps.close')}
            onClick={onClose}
            className={styles.closeBtn}
          >
            ×
          </button>
        </div>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>{t('mindmaps.youType')}</th>
              <th className={styles.th}>{t('mindmaps.youGet')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.syntax}>
                <td className={styles.tdCode}>
                  <code className={styles.syntaxCode}>{row.syntax}</code>
                </td>
                <td className={styles.tdRendered}>
                  <Markdown>{row.rendered}</Markdown>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </dialog>
    </div>
  );
}
