import { useEffect, useRef } from 'react';
import Markdown from 'react-markdown';
import styles from './MindmapMarkdownModal.module.css';

interface MarkdownRow {
  syntax: string;
  rendered: string;
}

const ROWS: MarkdownRow[] = [
  { syntax: '**bold**', rendered: '**Bold text**' },
  { syntax: '*italic*', rendered: '*Italic text*' },
  { syntax: '`code`', rendered: '`inline code`' },
  { syntax: '# Heading', rendered: '# Heading' },
  { syntax: '[text](url)', rendered: '[Link text](https://example.com)' },
];

interface MindmapMarkdownModalProps {
  onClose: () => void;
}

export function MindmapMarkdownModal({ onClose }: Readonly<MindmapMarkdownModalProps>) {
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
    <div
      data-testid="markdown-modal-backdrop"
      className={styles.backdrop}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="markdown-modal-title"
        data-testid="markdown-modal-card"
        className={styles.card}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 id="markdown-modal-title" className={styles.title}>
            Markdown in node labels
          </h2>
          <button
            ref={closeBtnRef}
            type="button"
            aria-label="Close"
            onClick={onClose}
            className={styles.closeBtn}
          >
            ×
          </button>
        </div>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>You type</th>
              <th className={styles.th}>You get</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
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
      </div>
    </div>
  );
}
