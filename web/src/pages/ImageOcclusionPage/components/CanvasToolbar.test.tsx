import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CanvasToolbar } from './CanvasToolbar';

function defaultProps() {
  return {
    activeTool: 'rect' as const,
    onToolChange: vi.fn(),
    masksHidden: false,
    onToggleMasks: vi.fn(),
    canUndo: true,
    canRedo: false,
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    hasSelection: true,
    onDuplicate: vi.fn(),
    onDelete: vi.fn(),
    zoom: 1,
    onZoomChange: vi.fn(),
    onFitZoom: vi.fn(),
    suggestionCount: 0,
    onClearSuggestions: vi.fn(),
  };
}

describe('CanvasToolbar', () => {
  it('renders the toolbar', () => {
    render(<CanvasToolbar {...defaultProps()} />);
    expect(screen.getByRole('toolbar')).toBeInTheDocument();
  });

  it('shows zoom as percentage', () => {
    render(<CanvasToolbar {...defaultProps()} zoom={1.5} />);
    expect(screen.getByTitle('Zoom level')).toHaveTextContent('150%');
  });

  it('marks rect tool as active when activeTool is rect', () => {
    render(<CanvasToolbar {...defaultProps()} activeTool="rect" />);
    expect(screen.getByTitle('Rectangle tool').className).toMatch(/btnActive/);
  });

  it('marks ellipse tool as active when activeTool is ellipse', () => {
    render(<CanvasToolbar {...defaultProps()} activeTool="ellipse" />);
    expect(screen.getByTitle('Ellipse tool').className).toMatch(/btnActive/);
  });

  it('marks polygon tool as active when activeTool is polygon', () => {
    render(<CanvasToolbar {...defaultProps()} activeTool="polygon" />);
    expect(screen.getByTitle('Polygon tool').className).toMatch(/btnActive/);
  });

  it('calls onToolChange when ellipse is clicked', () => {
    const props = defaultProps();
    render(<CanvasToolbar {...props} />);
    fireEvent.click(screen.getByTitle('Ellipse tool'));
    expect(props.onToolChange).toHaveBeenCalledWith('ellipse');
  });

  it('undo button is disabled when canUndo is false', () => {
    render(<CanvasToolbar {...defaultProps()} canUndo={false} />);
    expect(screen.getByTitle('Undo')).toBeDisabled();
  });

  it('redo button is disabled when canRedo is false', () => {
    render(<CanvasToolbar {...defaultProps()} canRedo={false} />);
    expect(screen.getByTitle('Redo')).toBeDisabled();
  });

  it('duplicate and delete are disabled when hasSelection is false', () => {
    render(<CanvasToolbar {...defaultProps()} hasSelection={false} />);
    expect(screen.getByTitle('Duplicate selected')).toBeDisabled();
    expect(screen.getByTitle('Delete selected')).toBeDisabled();
  });

  it('calls onUndo when undo is clicked', () => {
    const props = defaultProps();
    render(<CanvasToolbar {...props} canUndo={true} />);
    fireEvent.click(screen.getByTitle('Undo'));
    expect(props.onUndo).toHaveBeenCalled();
  });

  it('calls onDelete when delete is clicked', () => {
    const props = defaultProps();
    render(<CanvasToolbar {...props} hasSelection={true} />);
    fireEvent.click(screen.getByTitle('Delete selected'));
    expect(props.onDelete).toHaveBeenCalled();
  });

  it('calls onDuplicate when duplicate is clicked', () => {
    const props = defaultProps();
    render(<CanvasToolbar {...props} hasSelection={true} />);
    fireEvent.click(screen.getByTitle('Duplicate selected'));
    expect(props.onDuplicate).toHaveBeenCalled();
  });

  it('calls onToggleMasks when eye button is clicked', () => {
    const props = defaultProps();
    render(<CanvasToolbar {...props} />);
    fireEvent.click(screen.getByTitle('Hide masks'));
    expect(props.onToggleMasks).toHaveBeenCalled();
  });

  it('shows zoom options on click and calls onZoomChange', () => {
    const props = defaultProps();
    render(<CanvasToolbar {...props} />);
    fireEvent.click(screen.getByTitle('Zoom level'));
    fireEvent.click(screen.getByText('150%'));
    expect(props.onZoomChange).toHaveBeenCalledWith(1.5);
  });

  it('calls onFitZoom when Fit is selected', () => {
    const props = defaultProps();
    render(<CanvasToolbar {...props} />);
    fireEvent.click(screen.getByTitle('Zoom level'));
    fireEvent.click(screen.getByText('Fit'));
    expect(props.onFitZoom).toHaveBeenCalled();
  });

  it('does not show Clear suggestions when suggestionCount is 0', () => {
    render(<CanvasToolbar {...defaultProps()} suggestionCount={0} />);
    expect(screen.queryByTitle('Clear all suggested rects')).toBeNull();
  });

  it('shows Clear suggestions button when suggestionCount > 0', () => {
    render(<CanvasToolbar {...defaultProps()} suggestionCount={3} />);
    expect(screen.getByTitle('Clear all suggested rects')).toBeInTheDocument();
  });

  it('calls onClearSuggestions when Clear suggestions is clicked', () => {
    const props = defaultProps();
    render(<CanvasToolbar {...props} suggestionCount={5} />);
    fireEvent.click(screen.getByTitle('Clear all suggested rects'));
    expect(props.onClearSuggestions).toHaveBeenCalled();
  });
});
