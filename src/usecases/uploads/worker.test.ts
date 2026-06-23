import fs from 'fs';
import type { MessagePort } from 'node:worker_threads';
import { getFileContents, runUploadGenerationInWorker } from './worker';
import { UploadedFile } from '../../lib/storage/types';
import CardOption from '../../lib/parser/Settings/CardOption';
import Workspace from '../../lib/parser/WorkSpace';
import { UploadGenerationTask } from './uploadGenerationTypes';

jest.mock('fs');
jest.mock('../../lib/parser/WorkSpace');

const mockFs = jest.mocked(fs);

function makeFile(overrides: Partial<UploadedFile>): UploadedFile {
  return {
    fieldname: 'file',
    originalname: 'test.html',
    encoding: '7bit',
    mimetype: 'text/html',
    size: 0,
    stream: null as never,
    destination: '',
    filename: 'test.html',
    path: '',
    buffer: undefined as never,
    key: 'test-key',
    ...overrides,
  };
}

describe('getFileContents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('dwell time logging', () => {
    let infoSpy: jest.SpyInstance;

    beforeEach(() => {
      infoSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined);
    });

    afterEach(() => {
      infoSpy.mockRestore();
    });

    it('logs dwellMs >= 0 when reading from buffer', () => {
      jest.useFakeTimers();
      jest.setSystemTime(1000);

      const content = Buffer.from('hello');
      const file = makeFile({ path: '', buffer: content });

      getFileContents(file, 900);

      expect(infoSpy).toHaveBeenCalledWith(
        '[upload] tempfile dwell',
        expect.objectContaining({
          dwellMs: expect.any(Number),
          mode: 'buffer',
          fileSizeBytes: 5,
        })
      );
      const logged = infoSpy.mock.calls[0][1] as { dwellMs: number };
      expect(logged.dwellMs).toBeGreaterThanOrEqual(0);

      jest.useRealTimers();
    });

    it('logs dwellMs >= 0 when reading from disk', () => {
      jest.useFakeTimers();
      jest.setSystemTime(2000);

      const content = Buffer.from('disk content');
      const file = makeFile({ path: '/tmp/upload-exists' });
      mockFs.existsSync = jest.fn().mockReturnValue(true);
      mockFs.readFileSync = jest.fn().mockReturnValue(content);

      getFileContents(file, 1500);

      expect(infoSpy).toHaveBeenCalledWith(
        '[upload] tempfile dwell',
        expect.objectContaining({
          dwellMs: expect.any(Number),
          mode: 'disk',
          fileSizeBytes: 12,
        })
      );
      const logged = infoSpy.mock.calls[0][1] as { dwellMs: number };
      expect(logged.dwellMs).toBeGreaterThanOrEqual(0);

      jest.useRealTimers();
    });
  });

  it('throws when path is set to a missing file and buffer is undefined', () => {
    const file = makeFile({
      path: '/tmp/upload-gone',
      buffer: undefined as never,
    });
    mockFs.existsSync = jest.fn().mockReturnValue(false);

    expect(() => getFileContents(file)).toThrow(
      'Uploaded file is no longer available on disk and has no buffer fallback'
    );
  });

  it('falls back to the snapshot buffer when the disk file was reaped', () => {
    // The receipt-time snapshot (GetUploadHandler) populates file.buffer while
    // the disk path is still set. When the temp file is reaped before the
    // worker runs, getFileContents must serve the captured bytes, not throw.
    const snapshot = Buffer.from('snapshot bytes');
    const file = makeFile({ path: '/tmp/upload-reaped', buffer: snapshot });
    mockFs.existsSync = jest.fn().mockReturnValue(false);

    const result = getFileContents(file);

    expect(result).toEqual(snapshot);
  });

  it('throws when neither path nor buffer is present', () => {
    const file = makeFile({ path: '', buffer: undefined as never });

    expect(() => getFileContents(file)).toThrow(
      'Uploaded file has neither a path nor a buffer'
    );
  });

  it('returns buffer contents when path is absent and buffer is present', () => {
    const content = Buffer.from('hello');
    const file = makeFile({ path: '', buffer: content });

    const result = getFileContents(file);

    expect(result).toEqual(content);
  });

  it('returns file contents when path exists on disk', () => {
    const content = Buffer.from('disk content');
    const file = makeFile({ path: '/tmp/upload-exists' });
    mockFs.existsSync = jest.fn().mockReturnValue(true);
    mockFs.readFileSync = jest.fn().mockReturnValue(content);

    const result = getFileContents(file);

    expect(result).toEqual(content);
  });
});

describe('runUploadGenerationInWorker', () => {
  function makeFakePort(): MessagePort {
    return {
      postMessage: jest.fn(),
      close: jest.fn(),
    } as unknown as MessagePort;
  }

  function makeTask(
    file: UploadedFile,
    progressPort?: MessagePort
  ): UploadGenerationTask {
    return {
      paying: false,
      files: [file],
      settings: new CardOption({}),
      workspace: {} as Workspace,
      enqueuedAt: Date.now(),
      userId: null,
      progressPort,
    };
  }

  let infoSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    infoSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined);
  });

  afterEach(() => {
    infoSpy.mockRestore();
  });

  it('returns a failure result with a non-empty message and error name when generation throws', async () => {
    const file = makeFile({
      originalname: 'existing.apkg',
      filename: 'existing.apkg',
      path: '',
      buffer: Buffer.from('not really a deck'),
    });

    const result = await runUploadGenerationInWorker(makeTask(file));

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('expected a failure result');
    }
    expect(result.error.message).toContain('already an Anki deck');
    expect(result.error.name).toBe('Error');
  });

  it('closes the progress port even when generation throws', async () => {
    const port = makeFakePort();
    const file = makeFile({
      originalname: 'existing.apkg',
      filename: 'existing.apkg',
      path: '',
      buffer: Buffer.from('not really a deck'),
    });

    await runUploadGenerationInWorker(makeTask(file, port));

    expect(port.close).toHaveBeenCalledTimes(1);
  });

  it('returns a success result with empty packages for an unsupported file type', async () => {
    const file = makeFile({
      originalname: 'notes.unsupported',
      filename: 'notes.unsupported',
      key: 'notes.unsupported',
      path: '',
      buffer: Buffer.from('plain text'),
    });
    const port = makeFakePort();

    const result = await runUploadGenerationInWorker(makeTask(file, port));

    expect(result).toEqual({ ok: true, packages: [], warnings: [] });
    expect(port.close).toHaveBeenCalledTimes(1);
  });
});
