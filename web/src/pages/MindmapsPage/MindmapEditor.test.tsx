import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const mockSetNodes = vi.fn();
const mockSetEdges = vi.fn();

const { mockUploadMindmapImage, mockUseMindmapById, mockUseUpdateMindmap } = vi.hoisted(() => ({
  mockUploadMindmapImage: vi.fn(),
  mockUseMindmapById: vi.fn(),
  mockUseUpdateMindmap: vi.fn(),
}));

vi.mock('./useMindmap', () => ({
  useMindmapById: mockUseMindmapById,
  useUpdateMindmap: mockUseUpdateMindmap,
  exportMindmap: vi.fn(),
  uploadMindmapImage: mockUploadMindmapImage,
}));

vi.mock('@xyflow/react', () => ({
  ReactFlow: ({ children }: { children?: ReactNode }) => createElement('div', { 'data-testid': 'react-flow' }, children),
  Controls: () => null,
  Background: () => null,
  useNodesState: () => [[], mockSetNodes, vi.fn()],
  useEdgesState: () => [[], mockSetEdges, vi.fn()],
  addEdge: vi.fn(),
  ConnectionMode: { Loose: 'loose' },
}));

function MockGraph() {
  return {
    setDefaultEdgeLabel: vi.fn(),
    setGraph: vi.fn(),
    setNode: vi.fn(),
    setEdge: vi.fn(),
    node: vi.fn().mockReturnValue({ x: 0, y: 0 }),
  };
}

vi.mock('dagre', () => ({
  default: {
    graphlib: { Graph: MockGraph },
    layout: vi.fn(),
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useParams: () => ({ id: 'map-1' }), useNavigate: () => vi.fn() };
});

const baseMap = {
  id: 'map-1',
  user_id: 42,
  title: 'Test map',
  data: { nodes: [], edges: [] },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return createElement(
    QueryClientProvider,
    { client: queryClient },
    createElement(MemoryRouter, { initialEntries: ['/mindmaps/map-1'] },
      createElement(Routes, null,
        createElement(Route, { path: '/mindmaps/:id', element: children })
      )
    )
  );
}

describe('MindmapEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMindmapById.mockReturnValue({ data: baseMap, isLoading: false });
    mockUseUpdateMindmap.mockReturnValue({ mutate: vi.fn() });
  });

  it('renders without crashing', async () => {
    const { MindmapEditor } = await import('./MindmapEditor');
    render(createElement(MindmapEditor), { wrapper });
    expect(screen.getByTestId('react-flow')).toBeDefined();
  });

  it('seeds nodes with an array on first load, then uses a functional updater on re-fetch', async () => {
    const mapWithNodes = {
      ...baseMap,
      data: {
        nodes: [{ id: 'n1', label: 'Root', position: { x: 10, y: 20 } }],
        edges: [],
      },
    };
    mockUseMindmapById.mockReturnValue({ data: mapWithNodes, isLoading: false });

    const { MindmapEditor } = await import('./MindmapEditor');
    const { rerender } = render(createElement(MindmapEditor), { wrapper });

    await waitFor(() => {
      expect(mockSetNodes).toHaveBeenCalled();
    });

    const firstCallArg = mockSetNodes.mock.calls[0][0];
    expect(Array.isArray(firstCallArg)).toBe(true);

    mockSetNodes.mockClear();

    const refetchedMap = {
      ...mapWithNodes,
      updated_at: new Date(Date.now() + 1000).toISOString(),
    };
    mockUseMindmapById.mockReturnValue({ data: refetchedMap, isLoading: false });

    await act(async () => {
      rerender(createElement(MindmapEditor));
    });

    await waitFor(() => {
      expect(mockSetNodes).toHaveBeenCalled();
    });

    const refetchCallArg = mockSetNodes.mock.calls[0][0];
    expect(typeof refetchCallArg).toBe('function');
  });

  it('paste image event triggers upload and node creation', async () => {
    const imageResult = { url: '/api/mindmaps/images/42/map-1/abc.png', width: 100, height: 80 };
    mockUploadMindmapImage.mockResolvedValue(imageResult);

    const { MindmapEditor } = await import('./MindmapEditor');
    render(createElement(MindmapEditor), { wrapper });

    const pngData = new Uint8Array([137, 80, 78, 71]);
    const file = new File([pngData], 'test.png', { type: 'image/png' });

    const mockItem = {
      kind: 'file' as const,
      type: 'image/png',
      getAsFile: () => file,
    };
    const mockClipboardData = {
      items: [mockItem],
      getData: () => '',
    };

    const pasteEvent = new Event('paste', { bubbles: true });
    Object.defineProperty(pasteEvent, 'clipboardData', { value: mockClipboardData });
    document.dispatchEvent(pasteEvent);

    await waitFor(() => {
      expect(mockUploadMindmapImage).toHaveBeenCalledWith('map-1', file);
    });
  });
});
