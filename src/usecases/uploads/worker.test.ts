import fs from 'fs';
import { getFileContents } from './worker';
import { UploadedFile } from '../../lib/storage/types';

jest.mock('fs');

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
