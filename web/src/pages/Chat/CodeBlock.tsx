import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './CodeBlock.module.css';

interface CodeBlockProps {
  language?: string;
  code: string;
}

export default function CodeBlock({ language, code }: CodeBlockProps) {
  const { t } = useTranslation('chat');
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <span className={styles.language}>{language ?? 'plaintext'}</span>
        <button
          type="button"
          className={styles.copyBtn}
          onClick={handleCopy}
          aria-label={t('codeBlock.copyCode')}
        >
          {copied ? t('codeBlock.copied') : t('codeBlock.copy')}
        </button>
      </div>
      <pre className={styles.pre}>
        <code>{code}</code>
      </pre>
    </div>
  );
}
