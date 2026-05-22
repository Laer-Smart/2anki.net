import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

import { UploadMindmapImageUseCase, MindmapImageTooLargeError, MindmapImageTypeError } from './UploadMindmapImageUseCase';

const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

function makeTempFile(buf: Buffer, ext: string): string {
  const p = path.join(os.tmpdir(), `mm-test-${Date.now()}${ext}`);
  fs.writeFileSync(p, buf);
  return p;
}

describe('UploadMindmapImageUseCase', () => {
  let uploadBase: string;
  let useCase: UploadMindmapImageUseCase;

  beforeEach(() => {
    uploadBase = fs.mkdtempSync(path.join(os.tmpdir(), 'mm-uc-'));
    useCase = new UploadMindmapImageUseCase(uploadBase);
  });

  afterEach(() => {
    fs.rmSync(uploadBase, { recursive: true, force: true });
  });

  it('accepts a PNG file and returns url, width, height', async () => {
    const tmpPath = makeTempFile(TINY_PNG, '.png');
    const result = await useCase.execute({
      userId: '42',
      mapId: 'map-1',
      file: { path: tmpPath, mimetype: 'image/png', size: TINY_PNG.length },
    });

    expect(result.url).toMatch(/^\/api\/mindmaps\/images\//);
    expect(result.width).toBe(1);
    expect(result.height).toBe(1);
  });

  it('writes the file to the expected directory', async () => {
    const tmpPath = makeTempFile(TINY_PNG, '.png');
    const result = await useCase.execute({
      userId: '42',
      mapId: 'map-1',
      file: { path: tmpPath, mimetype: 'image/png', size: TINY_PNG.length },
    });

    const filename = result.url.split('/').pop()!;
    const finalPath = path.join(uploadBase, 'mindmaps', '42', 'map-1', filename);
    expect(fs.existsSync(finalPath)).toBe(true);
  });

  it('rejects an SVG file', async () => {
    const svgBuf = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    const tmpPath = makeTempFile(svgBuf, '.svg');
    await expect(
      useCase.execute({
        userId: '42',
        mapId: 'map-1',
        file: { path: tmpPath, mimetype: 'image/svg+xml', size: svgBuf.length },
      })
    ).rejects.toBeInstanceOf(MindmapImageTypeError);
    fs.unlinkSync(tmpPath);
  });

  it('rejects a file exceeding 5 MB', async () => {
    const big = Buffer.alloc(5 * 1024 * 1024 + 1);
    const tmpPath = makeTempFile(big, '.png');
    await expect(
      useCase.execute({
        userId: '42',
        mapId: 'map-1',
        file: { path: tmpPath, mimetype: 'image/png', size: big.length },
      })
    ).rejects.toBeInstanceOf(MindmapImageTooLargeError);
    fs.unlinkSync(tmpPath);
  });
});
