import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCanvasZoom } from '../hooks/useCanvasZoom';
import { useOcclusionHistory } from '../hooks/useOcclusionHistory';
import styles from '../ImageOcclusionPage.module.css';
import { ImageEntry, OcclusionRect } from '../types';
import { ActiveTool, CanvasToolbar } from './CanvasToolbar';

interface Props {
  entry: ImageEntry;
  onRectsChange: (rects: OcclusionRect[]) => void;
}

interface DraftRect {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

type HandleDir = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

interface DragState {
  type: 'move' | 'resize';
  handle?: HandleDir;
  rectIds: string[];
  startPx: number;
  startPy: number;
  startRects: OcclusionRect[];
}

interface PanState {
  startPx: number;
  startPy: number;
  startPanX: number;
  startPanY: number;
}

const MIN_NORM = 0.01;
const HANDLE_SIZE = 8;
const POLYGON_CLOSE_DIST = 15;
const DUPLICATE_OFFSET = 0.02;

function generateId(): string {
  return crypto.randomUUID();
}

function toNorm(px: number, dim: number): number {
  return Math.max(0, Math.min(1, px / dim));
}

function clampRect(
  x: number,
  y: number,
  w: number,
  h: number
): { x: number; y: number; w: number; h: number } {
  const cx = Math.max(0, Math.min(1 - MIN_NORM, x));
  const cy = Math.max(0, Math.min(1 - MIN_NORM, y));
  return {
    x: cx,
    y: cy,
    w: Math.max(MIN_NORM, Math.min(1 - cx, w)),
    h: Math.max(MIN_NORM, Math.min(1 - cy, h)),
  };
}

function clampNorm(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function duplicateRects(rects: OcclusionRect[]): OcclusionRect[] {
  return rects.map((r) => {
    const newId = generateId();
    if (r.shape === 'polygon' && r.points) {
      const points = r.points.map((p) => ({
        x: clampNorm(p.x + DUPLICATE_OFFSET),
        y: clampNorm(p.y + DUPLICATE_OFFSET),
      }));
      const xs = points.map((p) => p.x);
      const ys = points.map((p) => p.y);
      return {
        ...r,
        id: newId,
        points,
        x: Math.min(...xs),
        y: Math.min(...ys),
      };
    }
    return {
      ...r,
      id: newId,
      x: clampNorm(r.x + DUPLICATE_OFFSET),
      y: clampNorm(r.y + DUPLICATE_OFFSET),
    };
  });
}

export function OcclusionCanvas({ entry, onRectsChange }: Readonly<Props>) {
  const { t } = useTranslation('tools');
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [draft, setDraft] = useState<DraftRect | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [panState, setPanState] = useState<PanState | null>(null);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [middleMousePanning, setMiddleMousePanning] = useState(false);
  const [activeTool, setActiveTool] = useState<ActiveTool>('rect');
  const [masksHidden, setMasksHidden] = useState(false);
  const [pendingPolygon, setPendingPolygon] = useState<
    { x: number; y: number }[]
  >([]);
  const [cursorPt, setCursorPt] = useState<{ x: number; y: number } | null>(
    null
  );
  const [labelInput, setLabelInput] = useState('');

  const history = useOcclusionHistory(entry.rects);
  const { zoom, setZoom, panX, panY, setPan, handleWheel, fitZoom } =
    useCanvasZoom();

  const entryId = entry.id;
  useEffect(() => {
    setSelectedIds(new Set());
    setDraft(null);
    setDrag(null);
    setPendingPolygon([]);
    history.reset(entry.rects);
  }, [entryId]);

  useEffect(() => {
    if (selectedIds.size === 1) {
      const [id] = Array.from(selectedIds);
      const rect = entry.rects.find((r) => r.id === id);
      setLabelInput(rect?.label ?? '');
    } else {
      setLabelInput('');
    }
  }, [selectedIds, entry.rects]);

  const pushAndNotify = useCallback(
    (rects: OcclusionRect[]) => {
      history.push(rects);
      onRectsChange(rects);
    },
    [history, onRectsChange]
  );

  const getSvgPt = useCallback((e: React.PointerEvent | PointerEvent) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0, svgW: 1, svgH: 1 };
    const r = svg.getBoundingClientRect();
    return {
      x: e.clientX - r.left,
      y: e.clientY - r.top,
      svgW: r.width,
      svgH: r.height,
    };
  }, []);

  const toNormPt = useCallback(
    (svgX: number, svgY: number, svgW: number, svgH: number) => ({
      nx: toNorm(svgX, svgW),
      ny: toNorm(svgY, svgH),
    }),
    []
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onWheel = (e: WheelEvent) => {
      const rect = container.getBoundingClientRect();
      handleWheel(e, rect);
    };
    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, [handleWheel]);

  const closePolygon = useCallback(
    (polygon: { x: number; y: number }[], rects: OcclusionRect[]) => {
      if (polygon.length < 3) return;
      const xs = polygon.map((p) => p.x);
      const ys = polygon.map((p) => p.y);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      const maxX = Math.max(...xs);
      const maxY = Math.max(...ys);
      const newRect: OcclusionRect = {
        id: generateId(),
        label: '',
        x: minX,
        y: minY,
        w: Math.max(MIN_NORM, maxX - minX),
        h: Math.max(MIN_NORM, maxY - minY),
        shape: 'polygon',
        points: [...polygon],
      };
      const next = [...rects, newRect];
      pushAndNotify(next);
      setSelectedIds(new Set([newRect.id]));
      setPendingPolygon([]);
      setCursorPt(null);
    },
    [pushAndNotify]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (e.button === 1) {
        e.preventDefault();
        setMiddleMousePanning(true);
        setPanState({
          startPx: e.clientX,
          startPy: e.clientY,
          startPanX: panX,
          startPanY: panY,
        });
        try {
          (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
        } catch {
          /* jsdom */
        }
        return;
      }

      if (spaceHeld) {
        setPanState({
          startPx: e.clientX,
          startPy: e.clientY,
          startPanX: panX,
          startPanY: panY,
        });
        try {
          (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
        } catch {
          /* jsdom */
        }
        return;
      }

      const target = e.target as Element;
      const handleEl = target.closest('[data-handle]');
      const rectEl = target.closest('[data-rect]');

      if (handleEl) {
        const dir = handleEl.getAttribute('data-handle') as HandleDir;
        const rectId = handleEl
          .closest('[data-rect]')
          ?.getAttribute('data-rect');
        if (!rectId) return;
        const rect = entry.rects.find((r) => r.id === rectId);
        if (!rect) return;
        e.stopPropagation();
        const { x, y } = getSvgPt(e);
        setDrag({
          type: 'resize',
          handle: dir,
          rectIds: [rectId],
          startPx: x,
          startPy: y,
          startRects: [{ ...rect }],
        });
        try {
          (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
        } catch {
          /* jsdom */
        }
        return;
      }

      if (rectEl) {
        const rectId = rectEl.getAttribute('data-rect');
        if (!rectId) return;
        const rect = entry.rects.find((r) => r.id === rectId);
        if (!rect) return;
        e.stopPropagation();

        let newSelected: Set<string>;
        if (e.shiftKey) {
          newSelected = new Set(selectedIds);
          if (newSelected.has(rectId)) {
            newSelected.delete(rectId);
          } else {
            newSelected.add(rectId);
          }
        } else {
          newSelected = new Set([rectId]);
        }
        setSelectedIds(newSelected);

        const activeIds = Array.from(newSelected);
        const activeRects = entry.rects.filter((r) => activeIds.includes(r.id));
        const { x, y } = getSvgPt(e);
        setDrag({
          type: 'move',
          rectIds: activeIds,
          startPx: x,
          startPy: y,
          startRects: activeRects.map((r) => ({ ...r })),
        });
        try {
          (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
        } catch {
          /* jsdom */
        }
        return;
      }

      if (activeTool === 'polygon') {
        const { x, y, svgW, svgH } = getSvgPt(e);
        const { nx, ny } = toNormPt(x, y, svgW, svgH);

        if (pendingPolygon.length >= 3) {
          const first = pendingPolygon[0];
          const firstPx = first.x * svgW;
          const firstPy = first.y * svgH;
          const dist = Math.hypot(x - firstPx, y - firstPy);
          if (dist < POLYGON_CLOSE_DIST) {
            closePolygon(pendingPolygon, entry.rects);
            return;
          }
        }

        setPendingPolygon((prev) => [...prev, { x: nx, y: ny }]);
        setSelectedIds(new Set());
        try {
          (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
        } catch {
          /* jsdom */
        }
        return;
      }

      const { x, y } = getSvgPt(e);
      setDraft({ startX: x, startY: y, currentX: x, currentY: y });
      setSelectedIds(new Set());
      try {
        (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
      } catch {
        /* jsdom */
      }
    },
    [
      entry.rects,
      getSvgPt,
      toNormPt,
      selectedIds,
      spaceHeld,
      panX,
      panY,
      activeTool,
      pendingPolygon,
      closePolygon,
    ]
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (activeTool === 'polygon' && pendingPolygon.length >= 3) {
        e.preventDefault();
        closePolygon(pendingPolygon, entry.rects);
      }
    },
    [activeTool, pendingPolygon, entry.rects, closePolygon]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (panState) {
        const dx = (e.clientX - panState.startPx) / zoom;
        const dy = (e.clientY - panState.startPy) / zoom;
        setPan(panState.startPanX + dx, panState.startPanY + dy);
        return;
      }

      if (drag) {
        const { x, y, svgW, svgH } = getSvgPt(e);
        const dx = (x - drag.startPx) / svgW;
        const dy = (y - drag.startPy) / svgH;

        const updated = entry.rects.map((r) => {
          const startIdx = drag.rectIds.indexOf(r.id);
          if (startIdx === -1) return r;
          const sr = drag.startRects[startIdx];

          if (drag.type === 'move') {
            if (r.shape === 'polygon' && sr.points) {
              const newPoints = sr.points.map((p) => ({
                x: clampNorm(p.x + dx),
                y: clampNorm(p.y + dy),
              }));
              const xs = newPoints.map((p) => p.x);
              const ys = newPoints.map((p) => p.y);
              return {
                ...r,
                points: newPoints,
                x: Math.min(...xs),
                y: Math.min(...ys),
              };
            }
            const clamped = clampRect(sr.x + dx, sr.y + dy, sr.w, sr.h);
            return { ...r, ...clamped };
          }

          const h = drag.handle!;
          let nx = sr.x,
            ny = sr.y,
            nw = sr.w,
            nh = sr.h;
          if (h === 'nw') {
            nx = sr.x + dx;
            ny = sr.y + dy;
            nw = sr.w - dx;
            nh = sr.h - dy;
          } else if (h === 'n') {
            ny = sr.y + dy;
            nh = sr.h - dy;
          } else if (h === 'ne') {
            ny = sr.y + dy;
            nw = sr.w + dx;
            nh = sr.h - dy;
          } else if (h === 'e') {
            nw = sr.w + dx;
          } else if (h === 'se') {
            nw = sr.w + dx;
            nh = sr.h + dy;
          } else if (h === 's') {
            nh = sr.h + dy;
          } else if (h === 'sw') {
            nx = sr.x + dx;
            nw = sr.w - dx;
            nh = sr.h + dy;
          } else if (h === 'w') {
            nx = sr.x + dx;
            nw = sr.w - dx;
          }
          const clamped = clampRect(nx, ny, nw, nh);
          return { ...r, ...clamped };
        });

        onRectsChange(updated);
        return;
      }

      if (draft) {
        const { x, y } = getSvgPt(e);
        setDraft((prev) =>
          prev ? { ...prev, currentX: x, currentY: y } : null
        );
      }

      if (activeTool === 'polygon' && pendingPolygon.length > 0) {
        const { x, y } = getSvgPt(e);
        setCursorPt({ x, y });
      }
    },
    [
      panState,
      drag,
      draft,
      getSvgPt,
      entry.rects,
      onRectsChange,
      zoom,
      setPan,
      activeTool,
      pendingPolygon.length,
    ]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (panState) {
        setPanState(null);
        setMiddleMousePanning(false);
        return;
      }

      if (drag) {
        pushAndNotify(entry.rects);
        setDrag(null);
        return;
      }

      if (!draft) return;
      const { x, y, svgW, svgH } = getSvgPt(e);
      const wPx = Math.abs(x - draft.startX);
      const hPx = Math.abs(y - draft.startY);
      if (wPx >= 10 && hPx >= 10) {
        const { nx: nx1, ny: ny1 } = toNormPt(
          draft.startX,
          draft.startY,
          svgW,
          svgH
        );
        const { nx: nx2, ny: ny2 } = toNormPt(x, y, svgW, svgH);
        const raw = clampRect(
          Math.min(nx1, nx2),
          Math.min(ny1, ny2),
          Math.abs(nx2 - nx1),
          Math.abs(ny2 - ny1)
        );
        const shape: OcclusionRect['shape'] =
          activeTool === 'ellipse' ? 'ellipse' : 'rect';
        const newRect: OcclusionRect = {
          id: generateId(),
          label: '',
          shape,
          ...raw,
        };
        const next = [...entry.rects, newRect];
        pushAndNotify(next);
        setSelectedIds(new Set([newRect.id]));
      }
      setDraft(null);
    },
    [
      panState,
      drag,
      draft,
      getSvgPt,
      toNormPt,
      entry.rects,
      pushAndNotify,
      activeTool,
    ]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;

      if (e.key === ' ') {
        e.preventDefault();
        setSpaceHeld(true);
        return;
      }

      if (isCtrl && e.shiftKey && (e.key === 'Z' || e.key === 'z')) {
        e.preventDefault();
        const redone = history.redo();
        if (redone != null) onRectsChange(redone);
        return;
      }

      if (isCtrl && e.key === 'z') {
        e.preventDefault();
        const undone = history.undo();
        if (undone != null) onRectsChange(undone);
        return;
      }

      if (isCtrl && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        if (selectedIds.size === 0) return;
        const todup = entry.rects.filter((r) => selectedIds.has(r.id));
        const duped = duplicateRects(todup);
        const next = [...entry.rects, ...duped];
        pushAndNotify(next);
        setSelectedIds(new Set(duped.map((r) => r.id)));
        return;
      }

      if (e.key === 'Escape') {
        setSelectedIds(new Set());
        setPendingPolygon([]);
        return;
      }

      if (
        (e.key === 'Delete' || e.key === 'Backspace') &&
        selectedIds.size > 0
      ) {
        const next = entry.rects.filter((r) => !selectedIds.has(r.id));
        pushAndNotify(next);
        setSelectedIds(new Set());
      }
    },
    [selectedIds, entry.rects, pushAndNotify, history, onRectsChange]
  );

  const handleKeyUp = useCallback((e: React.KeyboardEvent) => {
    if (e.key === ' ') {
      setSpaceHeld(false);
    }
  }, []);

  const handleLabelChange = useCallback(
    (value: string) => {
      setLabelInput(value);
      const [id] = Array.from(selectedIds);
      if (!id) return;
      const next = entry.rects.map((r) =>
        r.id === id ? { ...r, label: value } : r
      );
      onRectsChange(next);
    },
    [selectedIds, entry.rects, onRectsChange]
  );

  const handleDuplicate = useCallback(() => {
    if (selectedIds.size === 0) return;
    const todup = entry.rects.filter((r) => selectedIds.has(r.id));
    const duped = duplicateRects(todup);
    const next = [...entry.rects, ...duped];
    pushAndNotify(next);
    setSelectedIds(new Set(duped.map((r) => r.id)));
  }, [selectedIds, entry.rects, pushAndNotify]);

  const handleDelete = useCallback(() => {
    if (selectedIds.size === 0) return;
    const next = entry.rects.filter((r) => !selectedIds.has(r.id));
    pushAndNotify(next);
    setSelectedIds(new Set());
  }, [selectedIds, entry.rects, pushAndNotify]);

  const handleUndoToolbar = useCallback(() => {
    const undone = history.undo();
    if (undone != null) onRectsChange(undone);
  }, [history, onRectsChange]);

  const handleRedoToolbar = useCallback(() => {
    const redone = history.redo();
    if (redone != null) onRectsChange(redone);
  }, [history, onRectsChange]);

  const handleFitZoom = useCallback(() => {
    const img = imgRef.current;
    const container = containerRef.current;
    if (!img || !container) return;
    fitZoom(
      img.naturalWidth,
      img.naturalHeight,
      container.clientWidth,
      container.clientHeight
    );
  }, [fitZoom]);

  const draftDisplay = useMemo(
    () =>
      draft
        ? {
            x: Math.min(draft.startX, draft.currentX),
            y: Math.min(draft.startY, draft.currentY),
            w: Math.abs(draft.currentX - draft.startX),
            h: Math.abs(draft.currentY - draft.startY),
          }
        : null,
    [draft]
  );

  const cursor = (() => {
    if (spaceHeld || middleMousePanning) return panState ? 'grabbing' : 'grab';
    return 'crosshair';
  })();

  const selectedOne =
    selectedIds.size === 1
      ? (entry.rects.find((r) => selectedIds.has(r.id)) ?? null)
      : null;

  const [svgSize, setSvgSize] = useState({ w: 1, h: 1 });
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const obs = new ResizeObserver(() => {
      setSvgSize({ w: svg.clientWidth, h: svg.clientHeight });
    });
    obs.observe(svg);
    setSvgSize({ w: svg.clientWidth, h: svg.clientHeight });
    return () => obs.disconnect();
  }, []);

  return (
    <div className={styles.canvasWrapper}>
      <CanvasToolbar
        activeTool={activeTool}
        onToolChange={setActiveTool}
        masksHidden={masksHidden}
        onToggleMasks={() => setMasksHidden((v) => !v)}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        onUndo={handleUndoToolbar}
        onRedo={handleRedoToolbar}
        hasSelection={selectedIds.size > 0}
        onDuplicate={handleDuplicate}
        onDelete={handleDelete}
        zoom={zoom}
        onZoomChange={setZoom}
        onFitZoom={handleFitZoom}
      />
      <div
        ref={containerRef}
        className={styles.canvasContainer}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        role="application"
        aria-label={t('occlusion.canvasAria')}
        style={{ cursor, position: 'relative', overflow: 'hidden' }}
      >
        <div
          style={{
            transform: `scale(${zoom}) translate(${panX}px, ${panY}px)`,
            transformOrigin: '0 0',
            display: 'inline-block',
          }}
        >
          <img
            ref={imgRef}
            src={entry.previewUrl}
            alt={entry.imageName}
            className={styles.canvasImage}
            draggable={false}
          />
          <svg
            ref={svgRef}
            className={styles.canvasSvg}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onDoubleClick={handleDoubleClick}
          >
            {entry.rects.map((rect, i) => {
              const isSelected = selectedIds.has(rect.id);
              const isGrouped = rect.groupId != null;
              const fillOpacity = masksHidden ? 0 : 0.7;
              const strokeOpacity = masksHidden ? 0.3 : 1;
              const strokeDasharray = masksHidden ? '6 3' : undefined;
              const fillColor = isSelected ? '#ff8e8e' : '#ffeba2';
              const strokeWidth = isGrouped ? 3 : 2;
              const isDragging =
                drag?.rectIds.includes(rect.id) && drag.type === 'move';
              const groupCursor = isDragging ? 'grabbing' : 'grab';

              const x = `${rect.x * 100}%`;
              const y = `${rect.y * 100}%`;
              const w = `${rect.w * 100}%`;
              const h = `${rect.h * 100}%`;
              const cx = `${(rect.x + rect.w) * 100}%`;
              const cy = `${(rect.y + rect.h) * 100}%`;
              const mx = `${(rect.x + rect.w / 2) * 100}%`;
              const my = `${(rect.y + rect.h / 2) * 100}%`;
              const hs = HANDLE_SIZE;

              const handles = (
                [
                  ['nw', x, y, 'nw-resize'],
                  ['n', mx, y, 'n-resize'],
                  ['ne', cx, y, 'ne-resize'],
                  ['e', cx, my, 'e-resize'],
                  ['se', cx, cy, 'se-resize'],
                  ['s', mx, cy, 's-resize'],
                  ['sw', x, cy, 'sw-resize'],
                  ['w', x, my, 'w-resize'],
                ] as const
              ).map(([dir, hx, hy, cur]) => (
                <rect
                  key={dir}
                  data-handle={dir}
                  x={hx}
                  y={hy}
                  width={hs}
                  height={hs}
                  transform={`translate(-${hs / 2}, -${hs / 2})`}
                  fill="#fff"
                  stroke="#212121"
                  strokeWidth={1.5}
                  style={{ cursor: cur }}
                />
              ));

              if (
                rect.shape === 'polygon' &&
                rect.points &&
                rect.points.length >= 3
              ) {
                const pointsAttr = rect.points
                  .map((p) => `${p.x * svgSize.w},${p.y * svgSize.h}`)
                  .join(' ');
                return (
                  <g
                    key={rect.id}
                    data-rect={rect.id}
                    style={{ cursor: groupCursor }}
                  >
                    <polygon
                      points={pointsAttr}
                      fill={fillColor}
                      fillOpacity={fillOpacity}
                      stroke="#212121"
                      strokeWidth={strokeWidth}
                      strokeOpacity={strokeOpacity}
                      strokeDasharray={strokeDasharray}
                    />
                    {isGrouped && (
                      <text
                        x={x}
                        y={y}
                        dy="-0.3em"
                        fontSize={10}
                        fill="#212121"
                        style={{ pointerEvents: 'none', userSelect: 'none' }}
                      >
                        G
                      </text>
                    )}
                    <text
                      x={mx}
                      y={my}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={11}
                      fontWeight="bold"
                      fill="#212121"
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >
                      {i + 1}
                    </text>
                    {isSelected && (
                      <rect
                        x={mx}
                        y={my}
                        width={hs}
                        height={hs}
                        transform={`translate(-${hs / 2}, -${hs / 2})`}
                        fill="#fff"
                        stroke="#212121"
                        strokeWidth={1.5}
                        style={{ cursor: 'move' }}
                      />
                    )}
                  </g>
                );
              }

              if (rect.shape === 'ellipse') {
                const ecx = `${(rect.x + rect.w / 2) * 100}%`;
                const ecy = `${(rect.y + rect.h / 2) * 100}%`;
                const rx = `${(rect.w / 2) * 100}%`;
                const ry = `${(rect.h / 2) * 100}%`;
                return (
                  <g
                    key={rect.id}
                    data-rect={rect.id}
                    style={{ cursor: groupCursor }}
                  >
                    <ellipse
                      cx={ecx}
                      cy={ecy}
                      rx={rx}
                      ry={ry}
                      fill={fillColor}
                      fillOpacity={fillOpacity}
                      stroke="#212121"
                      strokeWidth={strokeWidth}
                      strokeOpacity={strokeOpacity}
                      strokeDasharray={strokeDasharray}
                    />
                    {rect.label && (
                      <text
                        x={x}
                        y={y}
                        dy="1.2em"
                        dx="0.3em"
                        fontSize={12}
                        fill="#212121"
                        style={{ pointerEvents: 'none', userSelect: 'none' }}
                      >
                        {rect.label}
                      </text>
                    )}
                    {isGrouped && (
                      <text
                        x={x}
                        y={y}
                        dy="-0.3em"
                        fontSize={10}
                        fill="#212121"
                        style={{ pointerEvents: 'none', userSelect: 'none' }}
                      >
                        G
                      </text>
                    )}
                    <text
                      x={mx}
                      y={my}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={11}
                      fontWeight="bold"
                      fill="#212121"
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >
                      {i + 1}
                    </text>
                    {isSelected && handles}
                  </g>
                );
              }

              return (
                <g
                  key={rect.id}
                  data-rect={rect.id}
                  style={{ cursor: groupCursor }}
                >
                  <rect
                    x={x}
                    y={y}
                    width={w}
                    height={h}
                    fill={fillColor}
                    fillOpacity={fillOpacity}
                    stroke="#212121"
                    strokeWidth={strokeWidth}
                    strokeOpacity={strokeOpacity}
                    strokeDasharray={strokeDasharray}
                  />
                  {rect.label && (
                    <text
                      x={x}
                      y={y}
                      dy="1.2em"
                      dx="0.3em"
                      fontSize={12}
                      fill="#212121"
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >
                      {rect.label}
                    </text>
                  )}
                  {isGrouped && (
                    <text
                      x={x}
                      y={y}
                      dy="-0.3em"
                      fontSize={10}
                      fill="#212121"
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >
                      G
                    </text>
                  )}
                  <text
                    x={mx}
                    y={my}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={11}
                    fontWeight="bold"
                    fill="#212121"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {i + 1}
                  </text>
                  {isSelected && handles}
                </g>
              );
            })}

            {pendingPolygon.length > 0 &&
              (() => {
                const ptStr = pendingPolygon
                  .map((p) => `${p.x * svgSize.w},${p.y * svgSize.h}`)
                  .join(' ');
                const first = pendingPolygon[0];
                const last = pendingPolygon[pendingPolygon.length - 1];
                return (
                  <>
                    <polyline
                      points={ptStr}
                      fill="none"
                      stroke="#212121"
                      strokeWidth={2}
                      strokeDasharray="4 2"
                      style={{ pointerEvents: 'none' }}
                    />
                    {cursorPt && (
                      <line
                        x1={last.x * svgSize.w}
                        y1={last.y * svgSize.h}
                        x2={cursorPt.x}
                        y2={cursorPt.y}
                        stroke="var(--color-primary)"
                        strokeWidth={1.5}
                        strokeDasharray="5 3"
                        style={{ pointerEvents: 'none' }}
                      />
                    )}
                    {pendingPolygon.length >= 2 && (
                      <line
                        x1={last.x * svgSize.w}
                        y1={last.y * svgSize.h}
                        x2={first.x * svgSize.w}
                        y2={first.y * svgSize.h}
                        stroke="#888"
                        strokeWidth={1}
                        strokeDasharray="3 3"
                        style={{ pointerEvents: 'none' }}
                      />
                    )}
                    <circle
                      cx={first.x * svgSize.w}
                      cy={first.y * svgSize.h}
                      r={POLYGON_CLOSE_DIST / 2}
                      fill="rgba(79,70,229,0.25)"
                      stroke="var(--color-primary)"
                      strokeWidth={1.5}
                      style={{ pointerEvents: 'none' }}
                    />
                  </>
                );
              })()}

            {draftDisplay != null &&
              (activeTool === 'ellipse' ? (
                <ellipse
                  cx={draftDisplay.x + draftDisplay.w / 2}
                  cy={draftDisplay.y + draftDisplay.h / 2}
                  rx={draftDisplay.w / 2}
                  ry={draftDisplay.h / 2}
                  fill="#ffeba2"
                  fillOpacity={0.5}
                  stroke="#212121"
                  strokeWidth={1}
                  strokeDasharray="4 2"
                />
              ) : (
                <rect
                  x={draftDisplay.x}
                  y={draftDisplay.y}
                  width={draftDisplay.w}
                  height={draftDisplay.h}
                  fill="#ffeba2"
                  fillOpacity={0.5}
                  stroke="#212121"
                  strokeWidth={1}
                  strokeDasharray="4 2"
                />
              ))}
          </svg>
        </div>
        {entry.rects.length === 0 &&
          draft == null &&
          pendingPolygon.length === 0 && (
            <div className={styles.canvasEmptyHint}>
              {t('occlusion.dragBoxHint')}
            </div>
          )}
        {selectedOne != null && (
          <div className={styles.labelInputWrapper}>
            <input
              type="text"
              value={labelInput}
              onChange={(e) => handleLabelChange(e.target.value)}
              placeholder={t('occlusion.labelPlaceholder')}
              className={styles.labelInput}
              aria-label={t('occlusion.rectLabelAria')}
            />
          </div>
        )}
      </div>
    </div>
  );
}
