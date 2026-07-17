import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './OverlappingClozePreview.module.css';

type OverlappingClozeStyle = 'show-all' | 'windowed';

interface OverlappingClozePreviewProps {
  style: OverlappingClozeStyle;
}

const LINES = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter'] as const;
const HIDDEN_SLOT = '[ … ]';

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function isInWindow(
  style: OverlappingClozeStyle,
  hiddenIndex: number,
  lineIndex: number
): boolean {
  if (style === 'show-all') return true;
  return Math.abs(lineIndex - hiddenIndex) <= 1;
}

function Frame({
  style,
  hiddenIndex,
  position,
}: Readonly<{
  style: OverlappingClozeStyle;
  hiddenIndex: number;
  position: number;
}>) {
  return (
    <span
      className={styles.frame}
      data-testid="frame"
      style={{ '--frame-index': position } as React.CSSProperties}
    >
      {LINES.map((line, lineIndex) => {
        if (!isInWindow(style, hiddenIndex, lineIndex)) {
          return null;
        }
        if (lineIndex === hiddenIndex) {
          return (
            <span key={line} className={styles.line}>
              <span className={styles.slot}>{HIDDEN_SLOT}</span>
            </span>
          );
        }
        return (
          <span key={line} className={styles.line}>
            <span className={styles.lineText}>{line}</span>
          </span>
        );
      })}
    </span>
  );
}

export function OverlappingClozePreview({
  style,
}: Readonly<OverlappingClozePreviewProps>) {
  const { t } = useTranslation('chrome');
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setReducedMotion(prefersReducedMotion());
  }, []);

  const hiddenIndices = reducedMotion ? [0] : LINES.map((_, index) => index);

  return (
    <span
      className={styles.preview}
      role="img"
      aria-label={t('cloze.previewAlt')}
    >
      <span className={styles.deck} aria-hidden>
        {hiddenIndices.map((hiddenIndex, position) => (
          <Frame
            key={hiddenIndex}
            style={style}
            hiddenIndex={hiddenIndex}
            position={position}
          />
        ))}
      </span>
      <span className={styles.caption}>{t('cloze.caption')}</span>
    </span>
  );
}

export default OverlappingClozePreview;
