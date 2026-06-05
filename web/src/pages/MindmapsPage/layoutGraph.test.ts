import { describe, it, expect } from 'vitest';
import type { Node, Edge } from '@xyflow/react';
import { layoutGraph } from './layoutGraph';

function makeNode(id: string): Node {
  return {
    id,
    position: { x: 0, y: 0 },
    data: { label: id },
  };
}

describe('layoutGraph', () => {
  it('returns the same count of nodes as input', () => {
    const nodes = [makeNode('a'), makeNode('b')];
    const result = layoutGraph(nodes, []);
    expect(result).toHaveLength(2);
  });

  it('gives a single node a finite position', () => {
    const result = layoutGraph([makeNode('solo')], []);
    expect(Number.isFinite(result[0].position.x)).toBe(true);
    expect(Number.isFinite(result[0].position.y)).toBe(true);
  });

  it('gives distinct positions to disconnected nodes', () => {
    const nodes = [makeNode('a'), makeNode('b'), makeNode('c')];
    const result = layoutGraph(nodes, []);
    const positions = result.map((n) => `${n.position.x},${n.position.y}`);
    const unique = new Set(positions);
    expect(unique.size).toBe(3);
  });

  it('keeps connected nodes positioned relative to each other', () => {
    const nodes = [makeNode('parent'), makeNode('child')];
    const edges: Edge[] = [{ id: 'e1', source: 'parent', target: 'child' }];
    const result = layoutGraph(nodes, edges);
    const parent = result.find((n) => n.id === 'parent')!;
    const child = result.find((n) => n.id === 'child')!;
    expect(parent.position.x).not.toBe(child.position.x);
  });

  it('disconnected nodes do not share the same x,y as each other', () => {
    const count = 5;
    const nodes = Array.from({ length: count }, (_, i) =>
      makeNode(`node-${i}`)
    );
    const result = layoutGraph(nodes, []);
    const positions = result.map((n) => `${n.position.x},${n.position.y}`);
    const unique = new Set(positions);
    expect(unique.size).toBe(count);
  });
});
