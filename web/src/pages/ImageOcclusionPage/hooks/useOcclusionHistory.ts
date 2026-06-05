import { useRef, useState, useCallback } from 'react';
import { OcclusionRect } from '../types';

const MAX_HISTORY = 50;

interface HistoryData {
  past: OcclusionRect[][];
  current: OcclusionRect[];
  future: OcclusionRect[][];
}

export function useOcclusionHistory(initial: OcclusionRect[]) {
  const dataRef = useRef<HistoryData>({
    past: [],
    current: initial,
    future: [],
  });
  const [, forceRender] = useState(0);

  const push = useCallback((newRects: OcclusionRect[]) => {
    const d = dataRef.current;
    const past = [...d.past, d.current];
    dataRef.current = {
      past:
        past.length > MAX_HISTORY
          ? past.slice(past.length - MAX_HISTORY)
          : past,
      current: newRects,
      future: [],
    };
    forceRender((n) => n + 1);
  }, []);

  const undo = useCallback((): OcclusionRect[] | null => {
    const d = dataRef.current;
    if (d.past.length === 0) return null;
    const past = d.past.slice(0, -1);
    const restored = d.past[d.past.length - 1];
    dataRef.current = {
      past,
      current: restored,
      future: [d.current, ...d.future],
    };
    forceRender((n) => n + 1);
    return restored;
  }, []);

  const redo = useCallback((): OcclusionRect[] | null => {
    const d = dataRef.current;
    if (d.future.length === 0) return null;
    const [restored, ...future] = d.future;
    dataRef.current = {
      past: [...d.past, d.current],
      current: restored,
      future,
    };
    forceRender((n) => n + 1);
    return restored;
  }, []);

  const reset = useCallback((newRects: OcclusionRect[]) => {
    dataRef.current = { past: [], current: newRects, future: [] };
    forceRender((n) => n + 1);
  }, []);

  return {
    rects: dataRef.current.current,
    push,
    undo,
    redo,
    canUndo: dataRef.current.past.length > 0,
    canRedo: dataRef.current.future.length > 0,
    reset,
  };
}
