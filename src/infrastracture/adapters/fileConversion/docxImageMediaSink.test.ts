import fs from 'fs';
import os from 'os';
import path from 'path';

import {
  createWorkspaceDocxImageMediaSink,
  extensionForContentType,
} from './docxImageMediaSink';

describe('extensionForContentType', () => {
  it.each([
    ['image/png', 'png'],
    ['image/jpeg', 'jpg'],
    ['image/gif', 'gif'],
    ['image/svg+xml', 'svg'],
    ['IMAGE/PNG', 'png'],
  ])('maps %s to %s', (contentType, expected) => {
    expect(extensionForContentType(contentType)).toBe(expected);
  });

  it('falls back to png for an unknown content type', () => {
    expect(extensionForContentType('image/unknown')).toBe('png');
  });
});

describe('createWorkspaceDocxImageMediaSink', () => {
  let workspace: string;

  beforeEach(() => {
    workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'docx-sink-'));
  });

  afterEach(() => {
    fs.rmSync(workspace, { recursive: true, force: true });
  });

  it('writes the bytes into the workspace under a hash-named file', () => {
    const sink = createWorkspaceDocxImageMediaSink(workspace);
    const bytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);

    const fileName = sink.write(bytes, 'image/png');

    expect(fileName).toMatch(/^[a-f0-9]+\.png$/);
    const onDisk = fs.readFileSync(path.join(workspace, fileName));
    expect(onDisk).toEqual(bytes);
  });

  it('returns a stable filename for identical bytes', () => {
    const sink = createWorkspaceDocxImageMediaSink(workspace);
    const bytes = Buffer.from('same-image-bytes');

    const first = sink.write(bytes, 'image/jpeg');
    const second = sink.write(bytes, 'image/jpeg');

    expect(first).toBe(second);
  });

  it('rejects empty image bytes', () => {
    const sink = createWorkspaceDocxImageMediaSink(workspace);
    expect(() => sink.write(Buffer.alloc(0), 'image/png')).toThrow(/empty/);
  });
});
