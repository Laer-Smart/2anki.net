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
import { useMindmapById, useUpdateMindmap, exportMindmap, uploadMindmapImage, type MindmapCardType } from './useMindmap';
import type { MindmapData } from './useMindmap';
import shared from '../../styles/shared.module.css';
import styles from './MindmapEditor.module.css';
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
  boxSizing: 'border-box' as const,
};

const SHORTCUT_GROUPS: {
  label: string;
  items: { keys: string[]; action: string }[];
}[] = [
  {
    label: 'Create',
    items: [
      { keys: ['Tab'], action: 'Add child' },
      { keys: ['Enter'], action: 'Add sibling' },
      { keys: ['Double-click canvas'], action: 'Add node' },
      { keys: ['Drag from node'], action: 'New connected node' },
      { keys: ['Paste text'], action: 'New node' },
      { keys: ['Paste or drop image'], action: 'Image node' },
    ],
  },
  {
    label: 'Edit',
    items: [
      { keys: ['F2', 'Double-click'], action: 'Rename node' },
      { keys: ['Backspace'], action: 'Delete' },
      { keys: ['Double-click border'], action: 'Auto-size' },
      { keys: ['Ctrl/Cmd+L'], action: 'Tidy layout' },
    ],
  },
  {
    label: 'Select',
    items: [
      { keys: ['Ctrl/Cmd+A'], action: 'Select all' },
      { keys: ['Esc'], action: 'Clear selection' },
      { keys: ['Right-click'], action: 'Context menu' },
      { keys: ['Click edge'], action: 'Edge menu' },
    ],
  },
];

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
  const [cardType, setCardType] = useState<MindmapCardType>('basic');

  function cardCountLabel(): string {
    if (cardType === 'markmap') return '1 card';
    const count = cardType === 'basic' ? basicCardCount : clozeCardCount;
    return `${count} ${count === 1 ? 'card' : 'cards'}`;
  }

  return (
    <div className={styles.exportModal}>
      <div className={styles.exportCard}>
        <h2 className={styles.exportTitle}>Download deck</h2>
        <label className={styles.exportLabel}>
          Deck name
        </label>
        <input
          type="text"
          value={deckName}
          onChange={(e) => setDeckName(e.target.value)}
          className={styles.exportInput}
        />
        <fieldset className={styles.exportFieldset}>
          <legend className={styles.exportLegend}>Card type</legend>
          <label className={styles.exportRadioLabel}>
            <input
              type="radio"
              name="card-type"
              value="basic"
              checked={cardType === 'basic'}
              onChange={() => setCardType('basic')}
            />
            Basic — one card per edge (parent → child)
          </label>
          <label className={styles.exportRadioLabel}>
            <input
              type="radio"
              name="card-type"
              value="cloze"
              checked={cardType === 'cloze'}
              onChange={() => setCardType('cloze')}
            />
            Cloze — one card per path, each node clozed in sequence
          </label>
          <label className={styles.exportRadioLabel}>
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
        <p className={styles.exportCount}>{cardCountLabel()}</p>
        <div className={styles.exportFooter}>
          <button type="button" onClick={onClose} className={`${shared.btnSecondary} ${shared.btnInline}`}>
            Cancel
          </button>
          <button
            type="button"
            disabled={exporting || deckName.trim().length === 0}
            onClick={() => onExport(deckName.trim(), cardType)}
            className={`${shared.btnPrimary} ${shared.btnInline}`}
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
  const [rfInstance, setRfInstanceState] = useState<ReactFlowInstance | null>(null);

  const setRfInstance = useCallback((instance: ReactFlowInstance) => {
    setRfInstanceState(instance);
    if (fitViewPending.current) {
      fitViewPending.current = false;
      instance.fitView({ duration: 0 });
    }
  }, []);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fitViewPending = useRef(false);

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

  const seededMapId = useRef<string | null>(null);

  useEffect(() => {
    if (map == null) return;

    if (seededMapId.current === map.id) {
      setNodes((current) =>
        current.map((n) => {
          const serverNode = map.data.nodes.find((sn) => sn.id === n.id);
          if (serverNode == null) return n;
          const dataChanged =
            serverNode.label !== (n.data as { label?: string }).label ||
            (serverNode.color ?? null) !== (n.data as { color?: string | null }).color;
          if (!dataChanged) return n;
          return {
            ...n,
            data: { ...n.data, label: serverNode.label, color: serverNode.color ?? null },
            style:
              serverNode.color == null
                ? NODE_STYLE
                : { ...NODE_STYLE, borderColor: serverNode.color, boxShadow: `0 0 0 1px ${serverNode.color}` },
          };
        })
      );
      return;
    }

    seededMapId.current = map.id;

    const someHasPosition = map.data.nodes.some((n) => n.position != null);

    const rfNodes: Node[] = map.data.nodes.map((n) => ({
      id: n.id,
      type: 'mindmap',
      data: { label: n.label, color: n.color ?? null, image: n.image ?? null },
      position: n.position ?? { x: 0, y: 0 },
      width: n.width,
      height: n.height,
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
    if (rfInstance == null) {
      fitViewPending.current = true;
    } else {
      rfInstance.fitView({ duration: 0 });
    }
    if (initialNodes.length === 1) {
      setSelectedNodeId(initialNodes[0].id);
    }
  }, [map, setNodes, setEdges, rfInstance]);

  const persistData = useCallback(
    (ns: Node[], es: Edge[]) => {
      if (saveTimer.current != null) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        const data: MindmapData = {
          nodes: ns.map((n) => ({
            id: n.id,
            label: String(n.data.label ?? ''),
            position: { x: n.position.x, y: n.position.y },
            width: n.width,
            height: n.height,
            color: (n.data as { color?: string | null }).color ?? null,
            image: (n.data as { image?: MindmapData['nodes'][number]['image'] }).image ?? undefined,
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

  const handleImageFile = useCallback(
    async (file: File, position: { x: number; y: number }) => {
      if (id == null) return;
      const newId = crypto.randomUUID();
      const placeholderNode: Node = {
        id: newId,
        type: 'mindmap',
        data: { label: '', uploading: true },
        position,
        style: NODE_STYLE,
      };
      setNodes((ns) => {
        const updated = [...ns, placeholderNode];
        persistData(updated, edges);
        return updated;
      });
      setSelectedNodeId(newId);

      try {
        const imageResult = await uploadMindmapImage(id, file);
        setNodes((ns) => {
          const updated = ns.map((n) =>
            n.id === newId
              ? { ...n, data: { ...n.data, uploading: false, image: imageResult } }
              : n
          );
          persistData(updated, edges);
          return updated;
        });
      } catch {
        setNodes((ns) => ns.filter((n) => n.id !== newId));
        setToast("Couldn't upload that image. Try again.");
        setTimeout(() => setToast(null), 4000);
      }
    },
    [id, setNodes, persistData, edges, setToast]
  );

  useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target instanceof HTMLElement) {
        const tag = target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) return;
      }

      const imageItem = Array.from(e.clipboardData?.items ?? []).find(
        (item) => item.kind === 'file' && item.type.startsWith('image/')
      );

      if (imageItem != null) {
        e.preventDefault();
        const file = imageItem.getAsFile();
        if (file == null) return;
        const center = rfInstance == null
          ? { x: 0, y: 0 }
          : rfInstance.screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
        handleImageFile(file, center);
        return;
      }

      if (rfInstance == null) return;
      const text = e.clipboardData?.getData('text/plain')?.trim();
      if (text == null || text.length === 0) return;
      e.preventDefault();
      const center = rfInstance.screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      });
      const newId = crypto.randomUUID();
      const newNode: Node = {
        id: newId,
        type: 'mindmap',
        data: { label: text },
        position: center,
        style: NODE_STYLE,
      };
      setNodes((ns) => {
        const updated = [...ns, newNode];
        persistData(updated, edges);
        return updated;
      });
      setSelectedNodeId(newId);
    }
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [rfInstance, setNodes, persistData, edges, handleImageFile]);

  const setNodeSize = useCallback((nodeId: string, width: number, height: number) => {
    setNodes((ns) => {
      const updated = ns.map((n) =>
        n.id === nodeId ? { ...n, width, height } : n
      );
      persistData(updated, edges);
      return updated;
    });
  }, [setNodes, persistData, edges]);

  const autoSizeNode = useCallback((nodeId: string) => {
    setNodes((ns) => {
      const updated = ns.map((n) => {
        if (n.id !== nodeId) return n;
        const next = { ...n };
        delete (next as { width?: number }).width;
        delete (next as { height?: number }).height;
        return next;
      });
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
            onResizeEnd: (width: number, height: number) => setNodeSize(props.id, width, height),
          }}
        />
      ),
    }),
    [commitLabel, cancelEdit, centerOnNode, setNodeColor, setNodeSize, startRename, deleteNode]
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
      ns.map((n) => {
        if (n.id !== nodeId) return n;
        const measured = (n as Node & { measured?: { width?: number; height?: number } }).measured;
        return {
          ...n,
          data: { ...n.data, editing: true },
          width: n.width ?? measured?.width,
          height: n.height ?? measured?.height,
        };
      })
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
      <div className={styles.mobileNotice}>
        <p className={styles.mobileNoticeText}>
          The mind map editor needs a larger screen. Open on desktop to build and export your map.
        </p>
        <button
          type="button"
          onClick={() => navigate('/mindmaps')}
          className={`${shared.btnSecondary} ${shared.btnInline}`}
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
        onDragOver={(e) => {
          if (Array.from(e.dataTransfer.items).some((item) => item.type.startsWith('image/'))) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          if (rfInstance == null) return;
          const file = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith('image/'));
          if (file == null) return;
          const position = rfInstance.screenToFlowPosition({ x: e.clientX, y: e.clientY });
          handleImageFile(file, position);
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
          onEdgeClick={(e, edge) => {
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
          onNodeDoubleClick={(e, node) => {
            const wrapper = (e.target as HTMLElement).closest('.react-flow__node') as HTMLElement | null;
            if (wrapper != null) {
              const rect = wrapper.getBoundingClientRect();
              const borderZone = 6;
              const nearBorder =
                e.clientX - rect.left < borderZone ||
                rect.right - e.clientX < borderZone ||
                e.clientY - rect.top < borderZone ||
                rect.bottom - e.clientY < borderZone;
              if (nearBorder) {
                autoSizeNode(node.id);
                return;
              }
            }
            startRename(node.id);
          }}
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
        >
          <Controls />
          <Background />
        </ReactFlow>
        <button
          type="button"
          onClick={handleTidy}
          title="Tidy layout (Ctrl/Cmd+L)"
          className={styles.tidyBtn}
        >
          Tidy layout
        </button>
      </div>

      <div className={styles.sidebar}>
        <div className={styles.sidebarTitleRow}>
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
            className={styles.sidebarTitle}
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
            className={styles.renameTrigger}
          >
            <PencilIcon width={14} height={14} />
          </button>
        </div>

        <p className={styles.statLine}>
          {nodes.length} {nodes.length === 1 ? 'node' : 'nodes'} · {edges.length} {edges.length === 1 ? 'edge' : 'edges'}
        </p>

        <details className={styles.shortcuts}>
          <summary className={styles.shortcutsSummary}>Keyboard shortcuts</summary>
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.label} className={styles.shortcutGroup}>
              <p className={styles.shortcutGroupLabel}>{group.label}</p>
              {group.items.map((item) => (
                <div key={item.action} className={styles.shortcutRow}>
                  <span className={styles.shortcutKeys}>
                    {item.keys.map((key) => (
                      <kbd key={key} className={styles.shortcutKey}>
                        {key}
                      </kbd>
                    ))}
                  </span>
                  <span className={styles.shortcutAction}>{item.action}</span>
                </div>
              ))}
            </div>
          ))}
          <p className={styles.shortcutNote}>Markdown works in node labels</p>
        </details>

        <div className={styles.primaryAction}>
          <button
            type="button"
            onClick={() => setShowExport(true)}
            className={shared.btnPrimary}
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
          className={styles.toast}
        >
          {toast}
        </div>
      )}

      {contextMenu != null && (
        <div
          role="menu"
          onClick={(e) => e.stopPropagation()}
          className={styles.contextMenu}
          style={{ top: contextMenu.y, left: contextMenu.x }}
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
              onAddChild={(nodeId) => { addChildNode(nodeId); setContextMenu(null); }}
              onAddSibling={(nodeId) => { addSiblingNode(nodeId); setContextMenu(null); }}
              onRename={(nodeId) => { setContextMenu(null); startRename(nodeId); }}
              onDelete={(nodeId) => { deleteNode(nodeId); setContextMenu(null); }}
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
      className={styles.contextMenuItem}
    >
      <span>{label}</span>
      <span className={styles.contextMenuShortcut}>{shortcut}</span>
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
