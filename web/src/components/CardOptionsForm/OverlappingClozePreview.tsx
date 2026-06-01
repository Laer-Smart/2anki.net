import { useEffect, useState } from 'react';
import styles from './OverlappingClozePreview.module.css';

type OverlappingClozeStyle = 'show-all' | 'windowed';

interface OverlappingClozePreviewProps {
  style: OverlappingClozeStyle;
}

const LINES = ['Mercury', 'Venus', 'Earth'] as const;
const HIDDEN_SLOT = '[ … ]';

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function isOutsideWindow(
  style: OverlappingClozeStyle,
  hiddenIndex: number,
  lineIndex: number,
): boolean {
  if (style === 'show-all') return false;
  return Math.abs(lineIndex - hiddenIndex) > 1;
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
        const hidden = lineIndex === hiddenIndex;
        if (hidden) {
          return (
            <span key={line} className={styles.line}>
              <span className={styles.slot}>{HIDDEN_SLOT}</span>
            </span>
          );
        }
        const outside = isOutsideWindow(style, hiddenIndex, lineIndex);
        return (
          <span key={line} className={styles.line}>
            <span
              className={outside ? styles.lineOutside : styles.lineText}
              data-outside={outside ? 'true' : undefined}
            >
              {line}
            </span>
          </span>
        );
      })}
    </span>
  );
}

export function OverlappingClozePreview({
  style,
}: Readonly<OverlappingClozePreviewProps>) {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setReducedMotion(prefersReducedMotion());
  }, []);

  const hiddenIndices = reducedMotion ? [0] : [0, 1, 2];

  return (
    <span
      className={styles.preview}
      role="img"
      aria-label="Preview: each card hides one line of the list"
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
      <span className={styles.caption}>
        3 lines become 3 cards — each hides one
      </span>
    </span>
  );
}

export default OverlappingClozePreview;
