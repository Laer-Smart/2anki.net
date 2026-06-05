import { useState, useCallback } from 'react';

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;

function clampZoom(z: number): number {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));
}

export const ZOOM_PRESETS = [0.5, 1, 1.5, 2] as const;

export function useCanvasZoom() {
  const [zoom, setZoomRaw] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);

  const setZoom = useCallback((z: number) => {
    setZoomRaw(clampZoom(z));
  }, []);

  const setPan = useCallback((x: number, y: number) => {
    setPanX(x);
    setPanY(y);
  }, []);

  const fitZoom = useCallback(
    (
      imgW: number,
      imgH: number,
      containerW: number,
      containerH: number
    ): number => {
      if (imgW === 0 || imgH === 0) return 1;
      const fit = clampZoom(Math.min(containerW / imgW, containerH / imgH));
      setZoomRaw(fit);
      setPanX(0);
      setPanY(0);
      return fit;
    },
    []
  );

  const handleWheel = useCallback((e: WheelEvent, containerRect: DOMRect) => {
    const isZoomGesture = e.ctrlKey || e.metaKey;
    if (!isZoomGesture) return;
    e.preventDefault();

    const delta = -e.deltaY * 0.001;
    setZoomRaw((prevZoom) => {
      const newZoom = clampZoom(prevZoom + delta * prevZoom);

      const cursorX = e.clientX - containerRect.left;
      const cursorY = e.clientY - containerRect.top;

      setPanX(
        (prevPanX) => cursorX - (cursorX - prevPanX) * (newZoom / prevZoom)
      );
      setPanY(
        (prevPanY) => cursorY - (cursorY - prevPanY) * (newZoom / prevZoom)
      );

      return newZoom;
    });
  }, []);

  return {
    zoom,
    setZoom,
    panX,
    panY,
    setPan,
    handleWheel,
    zoomPresets: ZOOM_PRESETS,
    fitZoom,
  };
}
