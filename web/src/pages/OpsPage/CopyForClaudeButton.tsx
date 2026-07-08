import { useCallback, useEffect, useRef, useState } from 'react';

import sharedStyles from '../../styles/shared.module.css';

interface CopyForClaudeButtonProps {
  getText: () => string;
  disabled?: boolean;
}

export default function CopyForClaudeButton({
  getText,
  disabled = false,
}: Readonly<CopyForClaudeButtonProps>) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = useCallback(() => {
    const text = getText();
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(true);
        if (timerRef.current != null) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});
  }, [getText]);

  useEffect(() => {
    return () => {
      if (timerRef.current != null) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <button
      type="button"
      className={sharedStyles.btnSmall}
      disabled={disabled}
      onClick={handleCopy}
    >
      {copied ? 'Copied' : 'Copy for Claude Code'}
    </button>
  );
}
