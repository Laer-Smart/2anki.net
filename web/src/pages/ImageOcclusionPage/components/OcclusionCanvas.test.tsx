import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ImageEntry } from '../types';
import { OcclusionCanvas } from './OcclusionCanvas';

function makeEntry(overrides: Partial<ImageEntry> = {}): ImageEntry {
  return {
    id: 'entry-test',
    file: new File(['x'], 'test.jpg', { type: 'image/jpeg' }),
    imageName: 'test.jpg',
    header: '',
    rects: [],
    previewUrl: 'blob:fake',
    s3Key: null,
    uploading: false,
    ...overrides,
  };
}

describe('OcclusionCanvas', () => {
  it('renders the image', () => {
    const { getByRole } = render(
      <OcclusionCanvas entry={makeEntry()} onRectsChange={vi.fn()} />
    );
    expect(getByRole('img')).toBeTruthy();
  });

  it('renders existing rects as SVG rect elements', () => {
    const entry = makeEntry({
      rects: [
        {
          id: 'r1',
          x: 0.1,
          y: 0.1,
          w: 0.2,
          h: 0.2,
          label: '',
          shape: 'rect' as const,
        },
      ],
    });
    const { container } = render(
      <OcclusionCanvas entry={entry} onRectsChange={vi.fn()} />
    );
    const rects = container.querySelectorAll('rect');
    expect(rects.length).toBeGreaterThanOrEqual(1);
  });

  it('does not finalize a rect smaller than 10px in width', () => {
    const onRectsChange = vi.fn();
    const { container } = render(
      <OcclusionCanvas entry={makeEntry()} onRectsChange={onRectsChange} />
    );
    const svg = container.querySelector('svg')!;
    svg.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      right: 500,
      bottom: 400,
      width: 500,
      height: 400,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    fireEvent.pointerDown(svg, { clientX: 10, clientY: 10 });
    fireEvent.pointerMove(svg, { clientX: 15, clientY: 10 });
    fireEvent.pointerUp(svg, { clientX: 15, clientY: 10 });

    expect(onRectsChange).not.toHaveBeenCalled();
  });

  it('does not finalize a rect smaller than 10px in height', () => {
    const onRectsChange = vi.fn();
    const { container } = render(
      <OcclusionCanvas entry={makeEntry()} onRectsChange={onRectsChange} />
    );
    const svg = container.querySelector('svg')!;
    svg.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      right: 500,
      bottom: 400,
      width: 500,
      height: 400,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    fireEvent.pointerDown(svg, { clientX: 10, clientY: 10 });
    fireEvent.pointerMove(svg, { clientX: 10, clientY: 15 });
    fireEvent.pointerUp(svg, { clientX: 10, clientY: 15 });

    expect(onRectsChange).not.toHaveBeenCalled();
  });

  it('shows label input when a rect is selected', () => {
    const entry = makeEntry({
      rects: [
        {
          id: 'r1',
          x: 0.1,
          y: 0.1,
          w: 0.5,
          h: 0.5,
          label: 'Heart',
          shape: 'rect' as const,
        },
      ],
    });
    const { container, getByRole } = render(
      <OcclusionCanvas entry={entry} onRectsChange={vi.fn()} />
    );
    const svg = container.querySelector('svg')!;
    svg.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      right: 500,
      bottom: 400,
      width: 500,
      height: 400,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    const rectEl = container.querySelector('[data-rect]')!;
    fireEvent.pointerDown(rectEl, {
      clientX: 100,
      clientY: 100,
      bubbles: true,
    });
    const input = getByRole('textbox', { name: /Rect label/ });
    expect(input).toBeTruthy();
  });

  it('calls onRectsChange when Delete key pressed with selected rect', () => {
    const entry = makeEntry({
      rects: [
        {
          id: 'r1',
          x: 0.1,
          y: 0.1,
          w: 0.5,
          h: 0.5,
          label: '',
          shape: 'rect' as const,
        },
      ],
    });
    const onRectsChange = vi.fn();
    const { container } = render(
      <OcclusionCanvas entry={entry} onRectsChange={onRectsChange} />
    );
    const svg = container.querySelector('svg')!;
    svg.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      right: 500,
      bottom: 400,
      width: 500,
      height: 400,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    const rectEl = container.querySelector('[data-rect]')!;
    fireEvent.pointerDown(rectEl, {
      clientX: 100,
      clientY: 100,
      bubbles: true,
    });

    const appEl = container.querySelector('[role="application"]')!;
    fireEvent.keyDown(appEl, { key: 'Delete' });

    expect(onRectsChange).toHaveBeenCalledWith([]);
  });

  it('renders auto-suggested rects with a dashed stroke', () => {
    const entry = makeEntry({
      rects: [
        {
          id: 'r1',
          x: 0.1,
          y: 0.1,
          w: 0.2,
          h: 0.2,
          label: 'Drug A',
          shape: 'rect' as const,
          source: 'auto' as const,
          confidence: 0.9,
        },
      ],
    });
    const { container } = render(
      <OcclusionCanvas entry={entry} onRectsChange={vi.fn()} />
    );
    const svgRect = container.querySelector('[data-rect] rect');
    expect(svgRect?.getAttribute('stroke-dasharray')).toBeTruthy();
  });

  it('uses a distinct fill color for auto-suggested rects', () => {
    const entry = makeEntry({
      rects: [
        {
          id: 'r1',
          x: 0.1,
          y: 0.1,
          w: 0.2,
          h: 0.2,
          label: 'Drug A',
          shape: 'rect' as const,
          source: 'auto' as const,
          confidence: 0.9,
        },
      ],
    });
    const { container } = render(
      <OcclusionCanvas entry={entry} onRectsChange={vi.fn()} />
    );
    const svgRect = container.querySelector('[data-rect] rect');
    expect(svgRect?.getAttribute('fill')).toBe('#b3d9ff');
  });
});
