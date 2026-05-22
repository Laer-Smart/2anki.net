import { useEffect, useRef, useState } from 'react';
import { Handle, NodeToolbar, Position, type NodeProps } from '@xyflow/react';
import PencilIcon from '../../components/icons/PencilIcon';
import TrashIcon from '../../components/icons/TrashIcon';
import SwatchIcon from '../../components/icons/SwatchIcon';

export interface MindmapNodeData {
  label: string;
  editing?: boolean;
  color?: string | null;
  onCommit?: (label: string) => void;
  onCancel?: () => void;
  onStartRename?: () => void;
  onCenter?: () => void;
  onSetColor?: (color: string | null) => void;
  onDelete?: () => void;
  [key: string]: unknown;
}

const COLOR_PRESETS: Array<{ name: string; value: string | null }> = [
  { name: 'Default', value: null },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Green', value: '#10b981' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Purple', value: '#8b5cf6' },
];

const toolbarButtonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'transparent',
  border: 'none',
  borderRadius: 'var(--radius-sm)',
  padding: '0.25rem',
  cursor: 'pointer',
  color: 'var(--color-text-primary)',
  width: '28px',
  height: '28px',
};

function CenterIcon({ width = 16, height = 16 }: Readonly<{ width?: number; height?: number }>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      width={width}
      height={height}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v3M12 18v3M3 12h3M18 12h3" />
    </svg>
  );
}

export function MindmapNode({ data, selected }: NodeProps) {
  const nodeData = data as MindmapNodeData;
  const inputRef = useRef<HTMLInputElement>(null);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);

  useEffect(() => {
    if (nodeData.editing && inputRef.current != null) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [nodeData.editing]);

  useEffect(() => {
    if (!selected) setColorPickerOpen(false);
  }, [selected]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    e.stopPropagation();
    if (e.key === 'Enter') {
      const trimmed = inputRef.current?.value.trim() ?? '';
      nodeData.onCommit?.(trimmed.length > 0 ? trimmed : nodeData.label);
    } else if (e.key === 'Escape') {
      nodeData.onCancel?.();
    }
  }

  function handleBlur() {
    const trimmed = inputRef.current?.value.trim() ?? '';
    nodeData.onCommit?.(trimmed.length > 0 ? trimmed : nodeData.label);
  }

  return (
    <>
      <NodeToolbar
        isVisible={selected === true && nodeData.editing !== true}
        position={Position.Top}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.25rem',
            background: 'var(--color-bg-primary)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-md)',
            padding: '0.25rem',
          }}
        >
          <div style={{ display: 'flex', gap: '0.125rem' }}>
            <button
              type="button"
              title="Rename"
              aria-label="Rename"
              onClick={() => nodeData.onStartRename?.()}
              style={toolbarButtonStyle}
            >
              <PencilIcon width={16} height={16} />
            </button>
            <button
              type="button"
              title="Center on this node"
              aria-label="Center on this node"
              onClick={() => nodeData.onCenter?.()}
              style={toolbarButtonStyle}
            >
              <CenterIcon />
            </button>
            <button
              type="button"
              title="Color"
              aria-label="Color"
              onClick={() => setColorPickerOpen((o) => !o)}
              style={toolbarButtonStyle}
            >
              <SwatchIcon width={16} height={16} />
            </button>
            <button
              type="button"
              title="Delete"
              aria-label="Delete"
              onClick={() => nodeData.onDelete?.()}
              style={{ ...toolbarButtonStyle, color: '#ef4444' }}
            >
              <TrashIcon width={16} height={16} />
            </button>
          </div>
          {colorPickerOpen && (
            <div style={{ display: 'flex', gap: '0.25rem', padding: '0.25rem' }}>
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  title={c.name}
                  aria-label={c.name}
                  onClick={() => {
                    nodeData.onSetColor?.(c.value);
                    setColorPickerOpen(false);
                  }}
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    border: '1px solid var(--color-border)',
                    background: c.value ?? 'var(--color-bg-secondary)',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </NodeToolbar>
      <Handle type="source" position={Position.Left} id="left" />
      <Handle type="source" position={Position.Top} id="top" />
      <Handle type="source" position={Position.Bottom} id="bottom" />
      {nodeData.editing ? (
        <input
          ref={inputRef}
          type="text"
          defaultValue={nodeData.label}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          style={{
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: 'var(--text-sm)',
            width: '100%',
            minWidth: '80px',
            color: 'var(--color-text-primary)',
            fontFamily: 'inherit',
          }}
        />
      ) : (
        <span style={{ fontSize: 'var(--text-sm)', userSelect: 'none' }}>
          {nodeData.label}
        </span>
      )}
      <Handle type="source" position={Position.Right} id="right" />
    </>
  );
}
