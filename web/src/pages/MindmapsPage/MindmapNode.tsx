import { useEffect, useRef } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

export interface MindmapNodeData {
  label: string;
  editing?: boolean;
  onCommit?: (label: string) => void;
  onCancel?: () => void;
  [key: string]: unknown;
}

export function MindmapNode({ data }: NodeProps) {
  const nodeData = data as MindmapNodeData;
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (nodeData.editing && inputRef.current != null) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [nodeData.editing]);

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
