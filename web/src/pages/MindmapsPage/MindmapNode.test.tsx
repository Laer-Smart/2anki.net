import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MindmapNode } from './MindmapNode';

vi.mock('@xyflow/react', () => ({
  Handle: () => null,
  Position: { Left: 'left', Right: 'right' },
}));

function makeProps(overrides: Partial<{
  label: string;
  editing: boolean;
  onCommit: (label: string) => void;
  onCancel: () => void;
}> = {}) {
  return {
    data: {
      label: 'Test node',
      editing: false,
      onCommit: vi.fn(),
      onCancel: vi.fn(),
      ...overrides,
    },
    id: 'node-1',
    type: 'mindmap',
    selected: false,
    dragging: false,
    zIndex: 0,
    isConnectable: true,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
    draggable: true,
    selectable: true,
    deletable: true,
  } as Parameters<typeof MindmapNode>[0];
}

describe('MindmapNode', () => {
  it('renders label as text when not editing', () => {
    render(<MindmapNode {...makeProps({ label: 'Biology' })} />);
    expect(screen.getByText('Biology')).toBeDefined();
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('renders input when editing is true', () => {
    render(<MindmapNode {...makeProps({ editing: true })} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input).toBeDefined();
    expect(input.value).toBe('Test node');
  });

  it('calls onCommit with trimmed value on Enter', () => {
    const onCommit = vi.fn();
    render(<MindmapNode {...makeProps({ editing: true, onCommit })} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '  Chemistry  ' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onCommit).toHaveBeenCalledWith('Chemistry');
  });

  it('calls onCancel on Escape', () => {
    const onCancel = vi.fn();
    render(<MindmapNode {...makeProps({ editing: true, onCancel })} />);
    const input = screen.getByRole('textbox');
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalled();
  });

  it('calls onCommit with original label when Enter pressed with empty input', () => {
    const onCommit = vi.fn();
    render(<MindmapNode {...makeProps({ label: 'Physics', editing: true, onCommit })} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onCommit).toHaveBeenCalledWith('Physics');
  });

  it('calls onCommit on blur', () => {
    const onCommit = vi.fn();
    render(<MindmapNode {...makeProps({ editing: true, label: 'Math', onCommit })} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Mathematics' } });
    fireEvent.blur(input);
    expect(onCommit).toHaveBeenCalledWith('Mathematics');
  });

  it('stops key propagation while editing', () => {
    const handler = vi.fn();
    render(
      <div onKeyDown={handler}>
        <MindmapNode {...makeProps({ editing: true })} />
      </div>
    );
    const input = screen.getByRole('textbox');
    fireEvent.keyDown(input, { key: 'Tab' });
    expect(handler).not.toHaveBeenCalled();
  });
});
