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
  type ReactFlowInstance,
  Background,
  ConnectionMode,
} from '@xyflow/react';
import dagre from 'dagre';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMindmapById, useUpdateMindmap, exportMindmap, type MindmapCardType } from './useMindmap';
import type { MindmapData } from './useMindmap';
import styles from '../../styles/shared.module.css';
import { MindmapNode } from './MindmapNode';
import PencilIcon from '../../components/icons/PencilIcon';

const NODE_WIDTH = 172;
const NODE_HEIGHT = 36;
const FREE_NODE_LIMIT = 50;
const NODE_STYLE = {
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border)',
  background: 'var(--color-bg-primary)',
  boxShadow: 'var(--shadow-sm)',
  padding: '0.5rem 1rem',
  fontSize: 'var(--text-sm)',
};

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
  basicCardCount: number;
  clozeCardCount: number;
  onExport: (deckName: string, cardType: MindmapCardType) => void;
  onClose: () => void;
  exporting: boolean;
}

function ExportModal({ defaultName, basicCardCount, clozeCardCount, onExport, onClose, exporting }: Readonly<ExportModalProps>) {
  const [deckName, setDeckName] = useState(defaultName);
  const [cardType, setCardType] = useState<MindmapCardType>('cloze');

  function cardCountLabel(): string {
    if (cardType === 'markmap') return '1 card';
    const count = cardType === 'basic' ? basicCardCount : clozeCardCount;
    return `${count} ${count === 1 ? 'card' : 'cards'}`;
  }

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
        <fieldset
          style={{
            border: 'none',
            padding: 0,
            margin: '0 0 0.75rem',
          }}
        >
          <legend
            style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-secondary)',
              marginBottom: '0.5rem',
              padding: 0,
            }}
          >
            Card type
          </legend>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', fontSize: 'var(--text-sm)', cursor: 'pointer' }}>
            <input
              type="radio"
              name="card-type"
              value="cloze"
              checked={cardType === 'cloze'}
              onChange={() => setCardType('cloze')}
            />
            Cloze — one card per path, each node clozed in sequence
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', fontSize: 'var(--text-sm)', cursor: 'pointer' }}>
            <input
              type="radio"
              name="card-type"
              value="basic"
              checked={cardType === 'basic'}
              onChange={() => setCardType('basic')}
            />
            Basic — one card per edge (parent → child)
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: 'var(--text-sm)', cursor: 'pointer' }}>
            <input
              type="radio"
              name="card-type"
              value="markmap"
              checked={cardType === 'markmap'}
              onChange={() => setCardType('markmap')}
            />
            Whole map — entire tree as one interactive card
          </label>
        </fieldset>
        <p
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-secondary)',
            margin: '0 0 1.25rem',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {cardCountLabel()}
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} className={styles.btnSecondary}>
            Cancel
          </button>
          <button
            type="button"
            disabled={exporting || deckName.trim().length === 0}
            onClick={() => onExport(deckName.trim(), cardType)}
            className={`${styles.btnPrimary} ${styles.btnInline}`}
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

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string | null; edgeId?: string; flowX?: number; flowY?: number } | null>(null);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (titleRef.current != null && document.activeElement !== titleRef.current) {
      titleRef.current.innerText = map?.title ?? 'Untitled';
    }
  }, [map?.title]);

  function commitTitle(text: string) {
    const trimmed = text.trim();
    if (trimmed.length === 0 || trimmed === (map?.title ?? '')) return;
    updateMindmap.mutate({ title: trimmed });
  }

  useEffect(() => {
    if (map == null) return;

    const someHasPosition = map.data.nodes.some((n) => n.position != null);

    const rfNodes: Node[] = map.data.nodes.map((n) => ({
      id: n.id,
      type: 'mindmap',
      data: { label: n.label, color: n.color ?? null },
      position: n.position ?? { x: 0, y: 0 },
      style: n.color == null ? NODE_STYLE : { ...NODE_STYLE, borderColor: n.color, boxShadow: `0 0 0 1px ${n.color}` },
    }));
    const rfEdges: Edge[] = map.data.edges.map((e) => ({
      id: `${e.source}-${e.target}`,
      source: e.source,
      target: e.target,
      style: { stroke: 'var(--color-border)' },
    }));

    const initialNodes = someHasPosition ? rfNodes : layoutGraph(rfNodes, rfEdges);
    setNodes(initialNodes);
    setEdges(rfEdges);
    if (initialNodes.length === 1) {
      setSelectedNodeId(initialNodes[0].id);
    }
  }, [map, setNodes, setEdges]);

  const persistData = useCallback(
    (ns: Node[], es: Edge[]) => {
      if (saveTimer.current != null) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        const data: MindmapData = {
          nodes: ns.map((n) => ({
            id: n.id,
            label: String(n.data.label ?? ''),
            position: { x: n.position.x, y: n.position.y },
            color: (n.data as { color?: string | null }).color ?? null,
          })),
          edges: es.map((e) => ({ source: e.source, target: e.target })),
        };
        updateMindmap.mutate({ data });
      }, 800);
    },
    [updateMindmap]
  );

  const commitLabel = useCallback((nodeId: string, label: string) => {
    setNodes((ns) => {
      const updated = ns.map((n) =>
        n.id === nodeId
          ? { ...n, data: { ...n.data, label, editing: false } }
          : n
      );
      persistData(updated, edges);
      return updated;
    });
  }, [setNodes, persistData, edges]);

  const cancelEdit = useCallback((nodeId: string) => {
    setNodes((ns) =>
      ns.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, editing: false } } : n
      )
    );
  }, [setNodes]);

  const centerOnNode = useCallback((nodeId: string) => {
    rfInstance?.fitView({ nodes: [{ id: nodeId }], duration: 300, maxZoom: 1.2 });
  }, [rfInstance]);

  const setNodeColor = useCallback((nodeId: string, color: string | null) => {
    setNodes((ns) => {
      const updated = ns.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              data: { ...n.data, color },
              style: color == null
                ? NODE_STYLE
                : { ...NODE_STYLE, borderColor: color, boxShadow: `0 0 0 1px ${color}` },
            }
          : n
      );
      persistData(updated, edges);
      return updated;
    });
  }, [setNodes, persistData, edges]);

  const nodeTypes = useMemo(
    () => ({
      mindmap: (props: Parameters<typeof MindmapNode>[0]) => (
        <MindmapNode
          {...props}
          data={{
            ...props.data,
            onCommit: (label: string) => commitLabel(props.id, label),
            onCancel: () => cancelEdit(props.id),
            onStartRename: () => startRename(props.id),
            onCenter: () => centerOnNode(props.id),
            onSetColor: (color: string | null) => setNodeColor(props.id, color),
            onDelete: () => deleteNode(props.id),
          }}
        />
      ),
    }),
    [commitLabel, cancelEdit, centerOnNode, setNodeColor, startRename, deleteNode]
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

  const onEdgesDelete = useCallback(
    (deleted: Edge[]) => {
      const remaining = edges.filter((e) => !deleted.some((d) => d.id === e.id));
      persistData(nodes, remaining);
    },
    [nodes, edges, persistData]
  );

  function deleteEdge(edgeId: string) {
    const updatedEdges = edges.filter((e) => e.id !== edgeId);
    setEdges(updatedEdges);
    persistData(nodes, updatedEdges);
  }

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
      type: 'mindmap',
      data: { label: 'New node', editing: true },
      position: {
        x: (parentNode?.position.x ?? 0) + 200,
        y: (parentNode?.position.y ?? 0) + 50,
      },
      style: NODE_STYLE,
    };
    const newEdge: Edge = {
      id: `${parentId}-${newId}`,
      source: parentId,
      target: newId,
      style: { stroke: 'var(--color-border)' },
    };
    const updatedNodes = [...nodes, newNode];
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
      type: 'mindmap',
      data: { label: 'New node', editing: true },
      position: {
        x: siblingNode?.position.x ?? 0,
        y: (siblingNode?.position.y ?? 0) + NODE_HEIGHT + 20,
      },
      style: NODE_STYLE,
    };

    const updatedNodes = [...nodes, newNode];
    const updatedEdges =
      parentId == null
        ? [...edges]
        : [
            ...edges,
            {
              id: `${parentId}-${newId}`,
              source: parentId,
              target: newId,
              style: { stroke: 'var(--color-border)' },
            },
          ];

    setNodes(updatedNodes);
    setEdges(updatedEdges);
    setSelectedNodeId(newId);
    persistData(updatedNodes, updatedEdges);
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
    setNodes(updatedNodes);
    setEdges(updatedEdges);
    setSelectedNodeId(null);
    persistData(updatedNodes, updatedEdges);
  }

  function startRename(nodeId: string) {
    setNodes((ns) =>
      ns.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, editing: true } } : n
      )
    );
  }

  function handleTidy() {
    if (nodes.length === 0) return;
    const laidOut = layoutGraph(nodes, edges);
    setNodes(laidOut);
    persistData(laidOut, edges);
    rfInstance?.fitView({ duration: 300 });
    showToast('Layout updated');
  }

  function createNodeAt(position: { x: number; y: number }, parentId?: string | null) {
    if (nodes.length >= FREE_NODE_LIMIT) {
      showToast('50 nodes reached. Upgrade to add more.');
      return;
    }
    const newId = crypto.randomUUID();
    const newNode: Node = {
      id: newId,
      type: 'mindmap',
      data: { label: 'New node', editing: true },
      position,
      style: NODE_STYLE,
    };
    const updatedNodes = [...nodes, newNode];
    const updatedEdges = parentId == null
      ? edges
      : [
          ...edges,
          {
            id: `${parentId}-${newId}`,
            source: parentId,
            target: newId,
            style: { stroke: 'var(--color-border)' },
          },
        ];
    setNodes(updatedNodes);
    setEdges(updatedEdges);
    setSelectedNodeId(newId);
    persistData(updatedNodes, updatedEdges);
  }

  useEffect(() => {
    if (contextMenu == null) return;
    function close() {
      setContextMenu(null);
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
    }
    document.addEventListener('click', close);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('click', close);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [contextMenu]);

  useEffect(() => {
    function isEditableTarget(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      return (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        target.isContentEditable
      );
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (isEditableTarget(e.target)) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        handleTidy();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setNodes((ns) => ns.map((n) => ({ ...n, selected: true })));
        return;
      }

      if (e.key === 'Escape') {
        setNodes((ns) => ns.map((n) => ({ ...n, selected: false })));
        setSelectedNodeId(null);
        return;
      }

      if (selectedNodeId == null) return;

      if (e.key === 'Tab') {
        e.preventDefault();
        addChildNode(selectedNodeId);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        addSiblingNode(selectedNodeId);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        deleteNode(selectedNodeId);
      } else if (e.key === 'F2') {
        e.preventDefault();
        startRename(selectedNodeId);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  });

  const basicCardCount = edges.length;
  const leafNodeIds = new Set(nodes.map((n) => n.id));
  for (const edge of edges) {
    leafNodeIds.delete(edge.source);
  }
  const clozeCardCount = leafNodeIds.size;

  async function handleExport(deckName: string, cardType: MindmapCardType) {
    if (id == null) return;
    setExporting(true);
    try {
      const blob = await exportMindmap(id, deckName, cardType);
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
          className={styles.btnSecondary}
          style={{ marginTop: '1rem' }}
        >
          Back to Mind maps
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 60px)' }}>
      <div
        style={{ flex: 1, position: 'relative' }}
        onDoubleClick={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest('.react-flow__node') != null) return;
          if (target.closest('.react-flow__handle') != null) return;
          if (target.closest('.react-flow__controls') != null) return;
          if (rfInstance == null) return;
          const position = rfInstance.screenToFlowPosition({ x: e.clientX, y: e.clientY });
          createNodeAt(position, null);
        }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onInit={setRfInstance}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onEdgesDelete={onEdgesDelete}
          onConnect={onConnect}
          onEdgeContextMenu={(e, edge) => {
            e.preventDefault();
            setContextMenu({ x: e.clientX, y: e.clientY, nodeId: null, edgeId: edge.id });
          }}
          onConnectEnd={(e, connectionState) => {
            if (connectionState.toNode != null) return;
            if (rfInstance == null) return;
            const fromNodeId = connectionState.fromNode?.id;
            if (fromNodeId == null) return;
            const mouse = 'changedTouches' in e ? e.changedTouches[0] : (e as MouseEvent);
            const flow = rfInstance.screenToFlowPosition({ x: mouse.clientX, y: mouse.clientY });
            createNodeAt(flow, fromNodeId);
          }}
          onNodeClick={(_e, node) => setSelectedNodeId(node.id)}
          onNodeDoubleClick={(_e, node) => startRename(node.id)}
          onNodeDragStop={() => persistData(nodes, edges)}
          onNodeContextMenu={(e, node) => {
            e.preventDefault();
            setSelectedNodeId(node.id);
            setContextMenu({ x: e.clientX, y: e.clientY, nodeId: node.id });
          }}
          onPaneContextMenu={(e) => {
            e.preventDefault();
            if (rfInstance == null) return;
            const flow = rfInstance.screenToFlowPosition({
              x: (e as MouseEvent).clientX,
              y: (e as MouseEvent).clientY,
            });
            setContextMenu({
              x: (e as MouseEvent).clientX,
              y: (e as MouseEvent).clientY,
              nodeId: null,
              flowX: flow.x,
              flowY: flow.y,
            });
          }}
          proOptions={{ hideAttribution: true }}
          connectionMode={ConnectionMode.Loose}
          snapToGrid
          snapGrid={[20, 20]}
          fitView
        >
          <Controls />
          <Background />
        </ReactFlow>
        <button
          type="button"
          onClick={handleTidy}
          title="Tidy layout (Ctrl/Cmd+L)"
          style={{
            position: 'absolute',
            right: '1rem',
            bottom: '1rem',
            zIndex: 4,
            padding: '0.5rem 0.875rem',
            background: 'var(--color-bg-primary)',
            color: 'var(--color-text-primary)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-sm)',
            cursor: 'pointer',
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--font-medium)',
          }}
        >
          Tidy layout
        </button>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <h2
          ref={titleRef}
          contentEditable
          suppressContentEditableWarning
          spellCheck={false}
          title="Click to rename"
          onBlur={(e) => {
            const text = e.currentTarget.innerText;
            if (text.trim().length === 0) {
              e.currentTarget.innerText = map?.title ?? 'Untitled';
              return;
            }
            commitTitle(text);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              e.currentTarget.blur();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              e.currentTarget.innerText = map?.title ?? 'Untitled';
              e.currentTarget.blur();
            }
            e.stopPropagation();
          }}
          style={{
            fontSize: 'var(--text-lg)',
            fontWeight: 'var(--font-semibold)',
            margin: '-0.125rem -0.25rem',
            padding: '0.125rem 0.25rem',
            borderRadius: 'var(--radius-sm)',
            outline: 'none',
            cursor: 'text',
          }}
        >
          {map?.title ?? 'Untitled'}
        </h2>
          <button
            type="button"
            aria-label="Rename map"
            title="Rename map"
            onClick={() => {
              if (titleRef.current == null) return;
              titleRef.current.focus();
              const range = document.createRange();
              range.selectNodeContents(titleRef.current);
              const sel = window.getSelection();
              sel?.removeAllRanges();
              sel?.addRange(range);
            }}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-secondary)',
              padding: '0.25rem',
              borderRadius: 'var(--radius-sm)',
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            <PencilIcon width={16} height={16} />
          </button>
        </div>
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
          <p style={{ margin: '0 0 0.25rem' }}>Double-click / F2 — rename node</p>
          <p style={{ margin: '0 0 0.25rem' }}>Double-click canvas — add node here</p>
          <p style={{ margin: '0 0 0.25rem' }}>Right-click — menu (node, edge, or canvas)</p>
          <p style={{ margin: '0 0 0.25rem' }}>Drag from a node — new connected node</p>
          <p style={{ margin: '0 0 0.25rem' }}>Ctrl/Cmd+A — select all</p>
          <p style={{ margin: '0 0 0.25rem' }}>Esc — clear selection</p>
          <p style={{ margin: '0 0 0.25rem' }}>Ctrl/Cmd+L — tidy layout</p>
        </div>
        <div style={{ marginTop: 'auto' }}>
          <button
            type="button"
            onClick={() => setShowExport(true)}
            className={styles.btnPrimary}
          >
            Download deck
          </button>
        </div>
      </div>

      {showExport && (
        <ExportModal
          defaultName={map?.title ?? 'My deck'}
          basicCardCount={basicCardCount}
          clozeCardCount={clozeCardCount}
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

      {contextMenu != null && (
        <div
          role="menu"
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            background: 'var(--color-bg-primary)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-md)',
            padding: '0.25rem',
            minWidth: '180px',
            zIndex: 3000,
          }}
        >
          {contextMenu.edgeId != null && (
            <ContextMenuItem
              label="Remove connection"
              shortcut="Backspace"
              onSelect={() => {
                if (contextMenu.edgeId != null) {
                  deleteEdge(contextMenu.edgeId);
                }
                setContextMenu(null);
              }}
            />
          )}
          {contextMenu.edgeId == null && contextMenu.nodeId != null && (
            <NodeContextMenu
              nodeId={contextMenu.nodeId}
              onAddChild={(id) => { addChildNode(id); setContextMenu(null); }}
              onAddSibling={(id) => { addSiblingNode(id); setContextMenu(null); }}
              onRename={(id) => { setContextMenu(null); startRename(id); }}
              onDelete={(id) => { deleteNode(id); setContextMenu(null); }}
            />
          )}
          {contextMenu.edgeId == null && contextMenu.nodeId == null && (
            <ContextMenuItem
              label="Add node here"
              shortcut="Double-click"
              onSelect={() => {
                if (contextMenu.flowX != null && contextMenu.flowY != null) {
                  createNodeAt({ x: contextMenu.flowX, y: contextMenu.flowY }, null);
                }
                setContextMenu(null);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

interface ContextMenuItemProps {
  label: string;
  shortcut: string;
  onSelect: () => void;
}

function ContextMenuItem({ label, shortcut, onSelect }: Readonly<ContextMenuItemProps>) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onSelect}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        padding: '0.5rem 0.75rem',
        background: 'transparent',
        border: 'none',
        borderRadius: 'var(--radius-sm)',
        color: 'var(--color-text-primary)',
        fontSize: 'var(--text-sm)',
        textAlign: 'left',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--color-bg-secondary)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
      }}
    >
      <span>{label}</span>
      <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)', marginLeft: '1rem' }}>
        {shortcut}
      </span>
    </button>
  );
}

interface NodeContextMenuProps {
  nodeId: string;
  onAddChild: (id: string) => void;
  onAddSibling: (id: string) => void;
  onRename: (id: string) => void;
  onDelete: (id: string) => void;
}

function NodeContextMenu({ nodeId, onAddChild, onAddSibling, onRename, onDelete }: Readonly<NodeContextMenuProps>) {
  return (
    <>
      <ContextMenuItem label="Add child" shortcut="Tab" onSelect={() => onAddChild(nodeId)} />
      <ContextMenuItem label="Add sibling" shortcut="Enter" onSelect={() => onAddSibling(nodeId)} />
      <ContextMenuItem label="Rename" shortcut="F2" onSelect={() => onRename(nodeId)} />
      <ContextMenuItem label="Delete" shortcut="Backspace" onSelect={() => onDelete(nodeId)} />
    </>
  );
}
