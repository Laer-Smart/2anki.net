import { useCallback, useEffect, useRef, useState } from 'react';
import { track } from '../../lib/analytics/track';

const COLLAPSED_STORAGE_KEY = 'sidebar.collapsed';
const IDLE_THRESHOLD_MS = 20_000;
const REVERT_WINDOW_MS = 60_000;

const WORKFLOW_ROUTE_PREFIXES = ['/upload', '/notion', '/downloads'];
const WORKFLOW_ROUTE_PATTERNS = [/^\/mindmaps\/[^/]+/];

function isWorkflowRoute(pathname: string): boolean {
  if (WORKFLOW_ROUTE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return true;
  }
  return WORKFLOW_ROUTE_PATTERNS.some((pattern) => pattern.test(pathname));
}

function readCollapsedFromStorage(): boolean {
  try {
    return globalThis.localStorage?.getItem(COLLAPSED_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function writeCollapsedToStorage(next: boolean): void {
  try {
    globalThis.localStorage?.setItem(COLLAPSED_STORAGE_KEY, next ? 'true' : 'false');
  } catch {
    // localStorage unavailable (private mode, blocked) — state still updates in memory
  }
}

export interface SidebarCollapseState {
  collapsed: boolean;
  onToggleClick: () => void;
  onSidebarInteraction: () => void;
}

export function useSidebarCollapseState(pathname: string): SidebarCollapseState {
  const [persistedCollapsed, setPersistedCollapsed] = useState<boolean>(readCollapsedFromStorage);
  const [autoMinimized, setAutoMinimized] = useState(false);
  const [interactionTick, setInteractionTick] = useState(0);
  const pinnedRef = useRef(false);
  const autoMinimizedAtRef = useRef<number | null>(null);

  const onWorkflowRoute = isWorkflowRoute(pathname);

  useEffect(() => {
    if (!onWorkflowRoute) {
      setAutoMinimized(false);
      autoMinimizedAtRef.current = null;
    }
  }, [onWorkflowRoute]);

  useEffect(() => {
    if (!onWorkflowRoute) return undefined;
    if (persistedCollapsed) return undefined;
    if (autoMinimized) return undefined;
    if (pinnedRef.current) return undefined;

    const timerId = globalThis.setTimeout(() => {
      setAutoMinimized(true);
      autoMinimizedAtRef.current = Date.now();
      track('sidebar_auto_minimize_fired');
    }, IDLE_THRESHOLD_MS);

    return () => globalThis.clearTimeout(timerId);
  }, [onWorkflowRoute, persistedCollapsed, autoMinimized, interactionTick]);

  const onToggleClick = useCallback(() => {
    if (autoMinimized) {
      const collapsedAt = autoMinimizedAtRef.current;
      setAutoMinimized(false);
      autoMinimizedAtRef.current = null;
      pinnedRef.current = true;
      if (collapsedAt != null && Date.now() - collapsedAt < REVERT_WINDOW_MS) {
        track('sidebar_auto_minimize_reverted');
      }
      return;
    }
    const next = !persistedCollapsed;
    setPersistedCollapsed(next);
    writeCollapsedToStorage(next);
  }, [autoMinimized, persistedCollapsed]);

  const onSidebarInteraction = useCallback(() => {
    setInteractionTick((tick) => tick + 1);
  }, []);

  return {
    collapsed: persistedCollapsed || autoMinimized,
    onToggleClick,
    onSidebarInteraction,
  };
}
