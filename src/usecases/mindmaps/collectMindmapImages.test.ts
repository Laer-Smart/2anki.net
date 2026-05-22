import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { collectMindmapImages } from './collectMindmapImages';
import { MindmapData } from './MindmapData';

describe('collectMindmapImages', () => {
  let uploadBase: string;

  beforeEach(() => {
    uploadBase = fs.mkdtempSync(path.join(os.tmpdir(), 'mindmap-images-'));
  });

  afterEach(() => {
    fs.rmSync(uploadBase, { recursive: true, force: true });
  });

  function writeImage(relPath: string, body: string) {
    const full = path.join(uploadBase, 'mindmaps', relPath);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, body);
  }

  function nodeWithImage(id: string, url: string) {
    return {
      id,
      label: '',
      image: { url, width: 10, height: 10 },
    };
  }

  it('returns an empty array when no nodes have images', () => {
    const data: MindmapData = {
      nodes: [{ id: 'a', label: 'plain' }],
      edges: [],
    };
    expect(collectMindmapImages(data, uploadBase)).toEqual([]);
  });

  it('reads each referenced image into a buffer', () => {
    writeImage('user-1/map-1/foo.png', 'fake-png');
    const data: MindmapData = {
      nodes: [nodeWithImage('a', '/api/mindmaps/images/user-1/map-1/foo.png')],
      edges: [],
    };
    const result = collectMindmapImages(data, uploadBase);
    expect(result).toHaveLength(1);
    expect(result[0].filename).toBe('foo.png');
    expect(result[0].buffer.toString()).toBe('fake-png');
  });

  it('deduplicates nodes that share the same image url', () => {
    writeImage('user-1/map-1/foo.png', 'fake-png');
    const url = '/api/mindmaps/images/user-1/map-1/foo.png';
    const data: MindmapData = {
      nodes: [nodeWithImage('a', url), nodeWithImage('b', url)],
      edges: [],
    };
    const result = collectMindmapImages(data, uploadBase);
    expect(result).toHaveLength(1);
  });

  it('skips images that no longer exist on disk', () => {
    const data: MindmapData = {
      nodes: [
        nodeWithImage('a', '/api/mindmaps/images/user-1/map-1/missing.png'),
      ],
      edges: [],
    };
    expect(collectMindmapImages(data, uploadBase)).toEqual([]);
  });
});
