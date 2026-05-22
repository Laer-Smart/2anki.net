import '@xyflow/react/dist/style.css';
import {
  ReactFlow,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type Connection,
  Background,
} from '@xyflow/react';
import dagre from 'dagre';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMindmapById, useUpdateMindmap, exportMindmap } from './useMindmap';
import type { MindmapData } from './useMindmap';

const NODE_WIDTH = 172;
const NODE_HEIGHT = 36;
const FREE_NODE_LIMIT = 50;

function layoutGraph(nodes: Node[], edges: Edge[]): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'LR', ranksep: 60, nodesep: 30 });

  for (const node of nodes) {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }
  dagre.layout(g);

  return nodes.map((node) => {
    const pos = g.node(node.id);
    return {
      ...node,
      position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 },
    };
  });
}

interface ExportModalProps {
  defaultName: string;
  cardCount: number;
  onExport: (deckName: string) => void;
  onClose: () => void;
  exporting: boolean;
}

function ExportModal({ defaultName, cardCount, onExport, onClose, exporting }: Readonly<ExportModalProps>) {
  const [deckName, setDeckName] = useState(defaultName);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: 'var(--color-bg-primary)',
          borderRadius: 'var(--radius-lg)',
          padding: '2rem',
          width: '360px',
          maxWidth: '90vw',
        }}
      >
        <h2
          style={{
            fontSize: 'var(--text-xl)',
            fontWeight: 'var(--font-semibold)',
            margin: '0 0 1rem',
          }}
        >
          Download deck
        </h2>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
          Deck name
        </label>
        <input
          type="text"
          value={deckName}
          onChange={(e) => setDeckName(e.target.value)}
          style={{
            width: '100%',
            padding: '0.5rem',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '0.75rem',
            boxSizing: 'border-box',
          }}
        />
        <p
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-secondary)',
            margin: '0 0 1.25rem',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {cardCount} {cardCount === 1 ? 'card' : 'cards'}
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '0.5rem 1rem',
              background: 'transparent',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              color: 'var(--color-text-secondary)',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={exporting || deckName.trim().length === 0}
            onClick={() => onExport(deckName.trim())}
            style={{
              padding: '0.5rem 1rem',
              background: 'var(--color-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontWeight: 'var(--font-medium)',
              opacity: exporting ? 0.7 : 1,
            }}
          >
            Download deck
          </button>
        </div>
      </div>
    </div>
  );
}

export function MindmapEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: map } = useMindmapById(id ?? null);
  const updateMindmap = useUpdateMindmap(id ?? '');

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (map == null) return;
    const rfNodes: Node[] = map.data.nodes.map((n) => ({
      id: n.id,
      data: { label: n.label },
      position: { x: 0, y: 0 },
      style: {
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border)',
        background: 'var(--color-bg-primary)',
        boxShadow: 'var(--shadow-sm)',
        padding: '0.5rem 1rem',
        fontSize: 'var(--text-sm)',
      },
    }));
    const rfEdges: Edge[] = map.data.edges.map((e) => ({
      id: `${e.source}-${e.target}`,
      source: e.source,
      target: e.target,
      style: { stroke: 'var(--color-border)' },
    }));

    const laidOut = layoutGraph(rfNodes, rfEdges);
    setNodes(laidOut);
    setEdges(rfEdges);
  }, [map, setNodes, setEdges]);

  const persistData = useCallback(
    (ns: Node[], es: Edge[]) => {
      if (saveTimer.current != null) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        const data: MindmapData = {
          nodes: ns.map((n) => ({ id: n.id, label: String(n.data.label ?? '') })),
          edges: es.map((e) => ({ source: e.source, target: e.target })),
        };
        updateMindmap.mutate({ data });
      }, 800);
    },
    [updateMindmap]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((es) => {
        const updated = addEdge(connection, es);
        persistData(nodes, updated);
        return updated;
      });
    },
    [nodes, setEdges, persistData]
  );

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  function addChildNode(parentId: string) {
    if (nodes.length >= FREE_NODE_LIMIT) {
      showToast('50 nodes reached. Upgrade to add more.');
      return;
    }
    const newId = crypto.randomUUID();
    const parentNode = nodes.find((n) => n.id === parentId);
    const newNode: Node = {
      id: newId,
      data: { label: 'New node' },
      position: {
        x: (parentNode?.position.x ?? 0) + 200,
        y: (parentNode?.position.y ?? 0) + 50,
      },
      style: {
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border)',
        background: 'var(--color-bg-primary)',
        boxShadow: 'var(--shadow-sm)',
        padding: '0.5rem 1rem',
        fontSize: 'var(--text-sm)',
      },
    };
    const newEdge: Edge = {
      id: `${parentId}-${newId}`,
      source: parentId,
      target: newId,
      style: { stroke: 'var(--color-border)' },
    };
    const updatedNodes = layoutGraph([...nodes, newNode], [...edges, newEdge]);
    const updatedEdges = [...edges, newEdge];
    setNodes(updatedNodes);
    setEdges(updatedEdges);
    setSelectedNodeId(newId);
    persistData(updatedNodes, updatedEdges);
  }

  function addSiblingNode(siblingId: string) {
    if (nodes.length >= FREE_NODE_LIMIT) {
      showToast('50 nodes reached. Upgrade to add more.');
      return;
    }
    const parentEdge = edges.find((e) => e.target === siblingId);
    const parentId = parentEdge?.source ?? null;
    const newId = crypto.randomUUID();
    const siblingNode = nodes.find((n) => n.id === siblingId);
    const newNode: Node = {
      id: newId,
      data: { label: 'New node' },
      position: {
        x: siblingNode?.position.x ?? 0,
        y: (siblingNode?.position.y ?? 0) + NODE_HEIGHT + 20,
      },
      style: {
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border)',
        background: 'var(--color-bg-primary)',
        boxShadow: 'var(--shadow-sm)',
        padding: '0.5rem 1rem',
        fontSize: 'var(--text-sm)',
      },
    };

    const updatedNodes = [...nodes, newNode];
    const updatedEdges =
      parentId != null
        ? [
            ...edges,
            {
              id: `${parentId}-${newId}`,
              source: parentId,
              target: newId,
              style: { stroke: 'var(--color-border)' },
            },
          ]
        : [...edges];

    const laidOut = layoutGraph(updatedNodes, updatedEdges);
    setNodes(laidOut);
    setEdges(updatedEdges);
    setSelectedNodeId(newId);
    persistData(laidOut, updatedEdges);
  }

  function deleteNode(nodeId: string) {
    const childCount = edges.filter((e) => e.source === nodeId).length;
    if (childCount > 0) {
      const confirmed = window.confirm(
        'This node has children. Delete it and all connected edges?'
      );
      if (!confirmed) return;
    }
    const updatedNodes = nodes.filter((n) => n.id !== nodeId);
    const updatedEdges = edges.filter(
      (e) => e.source !== nodeId && e.target !== nodeId
    );
    const laidOut = layoutGraph(updatedNodes, updatedEdges);
    setNodes(laidOut);
    setEdges(updatedEdges);
    setSelectedNodeId(null);
    persistData(laidOut, updatedEdges);
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (selectedNodeId == null) return;
      if (e.target !== document.body) return;

      if (e.key === 'Tab') {
        e.preventDefault();
        addChildNode(selectedNodeId);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        addSiblingNode(selectedNodeId);
      } else if (e.key === 'Backspace') {
        deleteNode(selectedNodeId);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  });

  const cardCount = edges.length;

  async function handleExport(deckName: string) {
    if (id == null) return;
    setExporting(true);
    try {
      const blob = await exportMindmap(id, deckName);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${deckName}.apkg`;
      a.click();
      URL.revokeObjectURL(url);
      setShowExport(false);
      showToast('Deck downloaded — open it in Anki to start studying.');
    } finally {
      setExporting(false);
    }
  }

  if (isMobile) {
    return (
      <div
        style={{
          padding: '2rem 1.5rem',
          textAlign: 'center',
          color: 'var(--color-text-secondary)',
        }}
      >
        <p>The mind map editor needs a larger screen. Open on desktop to build and export your map.</p>
        <button
          type="button"
          onClick={() => navigate('/mindmaps')}
          style={{
            marginTop: '1rem',
            padding: '0.5rem 1rem',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            background: 'transparent',
          }}
        >
          Back to Mind maps
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 60px)' }}>
      <div style={{ flex: 1, position: 'relative' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={(_e, node) => setSelectedNodeId(node.id)}
          fitView
        >
          <Controls />
          <Background />
        </ReactFlow>
      </div>
      <div
        style={{
          width: '280px',
          borderLeft: '1px solid var(--color-border)',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          background: 'var(--color-bg-primary)',
        }}
      >
        <h2
          style={{
            fontSize: 'var(--text-lg)',
            fontWeight: 'var(--font-semibold)',
            margin: 0,
          }}
        >
          {map?.title ?? 'Untitled'}
        </h2>
        <p
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-secondary)',
            margin: 0,
          }}
        >
          {nodes.length} {nodes.length === 1 ? 'node' : 'nodes'} · {edges.length} {edges.length === 1 ? 'edge' : 'edges'}
        </p>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
          <p style={{ margin: '0 0 0.25rem' }}>Tab — add child</p>
          <p style={{ margin: '0 0 0.25rem' }}>Enter — add sibling</p>
          <p style={{ margin: '0 0 0.25rem' }}>Backspace — delete</p>
          <p style={{ margin: '0 0 0.25rem' }}>Double-click — edit label</p>
        </div>
        <div style={{ marginTop: 'auto' }}>
          <button
            type="button"
            onClick={() => setShowExport(true)}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: 'var(--color-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              fontWeight: 'var(--font-medium)',
            }}
          >
            Download deck
          </button>
        </div>
      </div>

      {showExport && (
        <ExportModal
          defaultName={map?.title ?? 'My deck'}
          cardCount={cardCount}
          onExport={handleExport}
          onClose={() => setShowExport(false)}
          exporting={exporting}
        />
      )}

      {toast != null && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            bottom: '1.5rem',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--color-text-primary)',
            color: 'var(--color-bg-primary)',
            padding: '0.75rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--text-sm)',
            zIndex: 2000,
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
