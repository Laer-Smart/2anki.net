import { afterEach, describe, expect, it, vi } from 'vitest';
import { crossOriginWorker } from './crossOriginWorker';

const workerUrls: string[] = [];

class FakeWorker {
  constructor(url: string) {
    workerUrls.push(url);
  }
}

function stubWorker() {
  workerUrls.length = 0;
  vi.stubGlobal('Worker', FakeWorker);
}

describe('crossOriginWorker', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('builds a same-origin blob worker that importScripts the cross-origin url', async () => {
    const blobs: Blob[] = [];
    vi.spyOn(URL, 'createObjectURL').mockImplementation(
      (blob: Blob | MediaSource) => {
        blobs.push(blob as Blob);
        return 'blob:mock';
      }
    );
    stubWorker();

    crossOriginWorker(
      'https://2anki-assets.fra1.cdn.digitaloceanspaces.com/assets/css.worker-CvXBzhp8.js'
    );

    expect(blobs).toHaveLength(1);
    expect(blobs[0].type).toBe('application/javascript');
    expect(workerUrls).toEqual(['blob:mock']);

    const source = await blobs[0].text();
    expect(source).toBe(
      'importScripts("https://2anki-assets.fra1.cdn.digitaloceanspaces.com/assets/css.worker-CvXBzhp8.js");'
    );
  });

  it('falls back to a direct worker when blob construction throws', () => {
    vi.spyOn(URL, 'createObjectURL').mockImplementation(() => {
      throw new Error('blob unsupported');
    });
    stubWorker();

    crossOriginWorker('/assets/editor.worker-abc.js');

    expect(workerUrls).toEqual(['/assets/editor.worker-abc.js']);
  });
});
