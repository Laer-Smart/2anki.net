import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './CanvasToolbar.module.css';

export type ActiveTool = 'rect' | 'ellipse' | 'polygon';

interface Props {
  activeTool: ActiveTool;
  onToolChange: (tool: ActiveTool) => void;
  masksHidden: boolean;
  onToggleMasks: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  hasSelection: boolean;
  onDuplicate: () => void;
  onDelete: () => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onFitZoom: () => void;
}

const ZOOM_OPTIONS = [
  { label: 'Fit', value: 'fit' as const },
  { label: '50%', value: 0.5 },
  { label: '100%', value: 1 },
  { label: '150%', value: 1.5 },
  { label: '200%', value: 2 },
];

export function CanvasToolbar({
  activeTool,
  onToolChange,
  masksHidden,
  onToggleMasks,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  hasSelection,
  onDuplicate,
  onDelete,
  zoom,
  onZoomChange,
  onFitZoom,
}: Readonly<Props>) {
  const { t } = useTranslation('tools');
  const [zoomOpen, setZoomOpen] = useState(false);
  const zoomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!zoomOpen) return;
    function onOutside(e: MouseEvent) {
      if (zoomRef.current && !zoomRef.current.contains(e.target as Node)) {
        setZoomOpen(false);
      }
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [zoomOpen]);

  return (
    <div
      className={styles.toolbar}
      role="toolbar"
      aria-label={t('occlusion.canvasTools')}
    >
      <button
        type="button"
        className={`${styles.btn} ${activeTool === 'rect' ? styles.btnActive : ''}`}
        title={t('occlusion.rectTool')}
        aria-label={t('occlusion.rectTool')}
        onClick={() => onToolChange('rect')}
      >
        &#9633;
      </button>
      <button
        type="button"
        className={`${styles.btn} ${activeTool === 'ellipse' ? styles.btnActive : ''}`}
        title={t('occlusion.ellipseTool')}
        aria-label={t('occlusion.ellipseTool')}
        onClick={() => onToolChange('ellipse')}
      >
        &#9711;
      </button>
      <button
        type="button"
        className={`${styles.btn} ${activeTool === 'polygon' ? styles.btnActive : ''}`}
        title={t('occlusion.polygonTool')}
        aria-label={t('occlusion.polygonTool')}
        onClick={() => onToolChange('polygon')}
      >
        &#x2B20;
      </button>

      <div className={styles.divider} />

      <button
        type="button"
        className={`${styles.btn} ${masksHidden ? styles.btnActive : ''}`}
        title={masksHidden ? t('occlusion.showMasks') : t('occlusion.hideMasks')}
        aria-label={
          masksHidden ? t('occlusion.showMasks') : t('occlusion.hideMasks')
        }
        onClick={onToggleMasks}
      >
        {masksHidden ? '\u{1F441}' : '\u{1F576}'}
      </button>

      <div className={styles.divider} />

      <button
        type="button"
        className={styles.btn}
        title={t('occlusion.undo')}
        aria-label={t('occlusion.undo')}
        onClick={onUndo}
        disabled={!canUndo}
      >
        &#8630;
      </button>
      <button
        type="button"
        className={styles.btn}
        title={t('occlusion.redo')}
        aria-label={t('occlusion.redo')}
        onClick={onRedo}
        disabled={!canRedo}
      >
        &#8631;
      </button>

      <div className={styles.divider} />

      <button
        type="button"
        className={styles.btn}
        title={t('occlusion.duplicateSelected')}
        aria-label={t('occlusion.duplicateSelected')}
        onClick={onDuplicate}
        disabled={!hasSelection}
      >
        &#10064;
      </button>
      <button
        type="button"
        className={styles.btn}
        title={t('occlusion.deleteSelected')}
        aria-label={t('occlusion.deleteSelected')}
        onClick={onDelete}
        disabled={!hasSelection}
      >
        &#x1F5D1;
      </button>

      <div className={styles.divider} />

      <div className={styles.zoomSelectWrapper} ref={zoomRef}>
        <button
          type="button"
          className={styles.zoomReadout}
          title={t('occlusion.zoomLevel')}
          aria-label={t('occlusion.zoomLevel')}
          onClick={() => setZoomOpen((o) => !o)}
        >
          {Math.round(zoom * 100)}%
        </button>
        {zoomOpen && (
          <div className={styles.zoomSelect}>
            {ZOOM_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                type="button"
                className={styles.zoomOption}
                onClick={() => {
                  setZoomOpen(false);
                  if (opt.value === 'fit') {
                    onFitZoom();
                  } else {
                    onZoomChange(opt.value);
                  }
                }}
              >
                {opt.value === 'fit' ? t('occlusion.zoomFit') : opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
